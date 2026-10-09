import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/token_store.dart';
import '../config/app_config.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

typedef Json = Map<String, dynamic>;

/// Single entry point for HTTP calls. Converts transport and Problem Details failures
/// into [ApiException] so features never handle [DioException] directly.
class ApiClient {
  ApiClient(this._dio, this._tokens);

  final Dio _dio;
  final TokenStore _tokens;

  /// Prefixes an org-scoped resource path (`v1/organizations/{orgId}/...`) for the signed-in tenant.
  String org(String resource) {
    final organizationId = _tokens.current?.claims?.organizationId;
    if (organizationId == null) {
      throw const ApiException(kind: ApiFailureKind.unauthorized);
    }
    return 'v1/organizations/$organizationId/$resource';
  }

  Future<T> get<T>(String path, {Map<String, Object?>? query}) =>
      _send(() => _dio.get<T>(path, queryParameters: _clean(query)));

  Future<T> post<T>(String path, {Object? body, bool authenticated = true}) => _send(
        () => _dio.post<T>(path, data: body, options: authenticated ? null : unauthenticated()),
      );

  Future<T> patch<T>(String path, {Object? body}) => _send(() => _dio.patch<T>(path, data: body));

  Future<T> put<T>(String path, {Object? body}) => _send(() => _dio.put<T>(path, data: body));

  Future<T> delete<T>(String path) => _send(() => _dio.delete<T>(path));

  Future<T> _send<T>(Future<Response<T>> Function() call) async {
    try {
      final response = await call();
      return response.data as T;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Map<String, Object?>? _clean(Map<String, Object?>? query) =>
      query == null ? null : {for (final e in query.entries) if (e.value != null) e.key: e.value};
}

Dio _buildDio(AppConfig config) => Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl.toString(),
        connectTimeout: config.connectTimeout,
        receiveTimeout: config.receiveTimeout,
        contentType: Headers.jsonContentType,
        responseType: ResponseType.json,
      ),
    );

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final tokens = ref.watch(tokenStoreProvider);
  final dio = _buildDio(config);
  dio.interceptors.add(AuthInterceptor(dio: dio, refreshDio: _buildDio(config), tokens: tokens));
  ref.onDispose(dio.close);
  return ApiClient(dio, tokens);
});
