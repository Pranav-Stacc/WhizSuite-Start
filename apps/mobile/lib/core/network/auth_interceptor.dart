import 'package:dio/dio.dart';

import '../auth/token_store.dart';

const _skipAuthKey = 'skipAuth';
const _retriedKey = 'authRetried';
const _authorizationHeader = 'authorization';
const organizationHeader = 'x-organization-id';
const _unauthorized = 401;
const _clientErrorRange = (min: 400, max: 499);

/// Marks a request as unauthenticated (login, register, refresh).
Options unauthenticated([Options? options]) =>
    (options ?? Options()).copyWith(extra: {...?options?.extra, _skipAuthKey: true});

/// Signs requests with the access token and tenant header, and rotates the refresh token on 401.
/// Queued so concurrent 401s trigger a single refresh; later requests reuse the rotated token.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({required this.dio, required this.refreshDio, required this.tokens});

  final Dio dio;
  final Dio refreshDio;
  final TokenStore tokens;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.extra[_skipAuthKey] != true) _sign(options, tokens.current);
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final request = err.requestOptions;
    final unauthorized = err.response?.statusCode == _unauthorized;
    if (!unauthorized || request.extra[_skipAuthKey] == true || request.extra[_retriedKey] == true) {
      return handler.next(err);
    }

    final current = tokens.current;
    if (current == null) return handler.next(err);

    final AuthTokens fresh;
    try {
      final sentToken = request.headers[_authorizationHeader];
      final alreadyRotated = sentToken != _bearer(current);
      final rotated = alreadyRotated ? current : await _refresh(current);
      if (rotated == null) {
        await tokens.clear(expired: true);
        return handler.next(err);
      }
      fresh = rotated;
    } on DioException {
      // Transport failure while refreshing: keep the session and surface the original error.
      return handler.next(err);
    }

    request.extra[_retriedKey] = true;
    _sign(request, fresh);
    try {
      handler.resolve(await dio.fetch<dynamic>(request));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  /// Returns null when the server rejects the refresh token; rethrows transport failures.
  Future<AuthTokens?> _refresh(AuthTokens current) async {
    try {
      final response = await refreshDio.post<Map<String, dynamic>>(
        'v1/auth/refresh',
        data: {'refreshToken': current.refreshToken},
      );
      final body = response.data;
      final access = body?['accessToken'];
      final refresh = body?['refreshToken'];
      if (access is! String || refresh is! String) return null;
      final rotated = AuthTokens(accessToken: access, refreshToken: refresh);
      await tokens.save(rotated);
      return rotated;
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status != null && status >= _clientErrorRange.min && status <= _clientErrorRange.max) return null;
      rethrow;
    }
  }

  String _bearer(AuthTokens auth) => 'Bearer ${auth.accessToken}';

  void _sign(RequestOptions options, AuthTokens? auth) {
    if (auth == null) return;
    options.headers[_authorizationHeader] = _bearer(auth);
    final organizationId = auth.claims?.organizationId;
    if (organizationId != null) options.headers[organizationHeader] = organizationId;
  }
}
