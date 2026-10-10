import 'dart:convert';

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

  Future<T> getUnauthenticated<T>(String path, {Map<String, Object?>? query}) => _send(
        () => _dio.get<T>(
          path,
          queryParameters: _clean(query),
          options: unauthenticated(),
        ),
      );

  Future<T> post<T>(String path, {Object? body, bool authenticated = true}) => _send(
        () => _dio.post<T>(path, data: body, options: authenticated ? null : unauthenticated()),
      );

  Future<T> patch<T>(String path, {Object? body}) => _send(() => _dio.patch<T>(path, data: body));

  Future<T> put<T>(String path, {Object? body}) => _send(() => _dio.put<T>(path, data: body));

  Future<T> delete<T>(String path) => _send(() => _dio.delete<T>(path));

  /// POSTs and yields each Server-Sent Event `data:` JSON object as it arrives.
  Stream<Json> postEvents(String path, {Object? body, Duration? idleTimeout}) async* {
    final Response<ResponseBody> response;
    try {
      response = await _dio.post<ResponseBody>(
        path,
        data: body,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'accept': 'text/event-stream'},
          receiveTimeout: idleTimeout,
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
    final data = response.data;
    if (data == null) throw const ApiException(kind: ApiFailureKind.server);

    var buffer = '';
    try {
      await for (final chunk in data.stream.cast<List<int>>().transform(utf8.decoder)) {
        buffer += chunk.replaceAll('\r\n', '\n');
        var boundary = buffer.indexOf('\n\n');
        while (boundary != -1) {
          final event = _parseEvent(buffer.substring(0, boundary));
          buffer = buffer.substring(boundary + 2);
          if (event != null) yield event;
          boundary = buffer.indexOf('\n\n');
        }
      }
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
    final trailing = _parseEvent(buffer);
    if (trailing != null) yield trailing;
  }

  static Json? _parseEvent(String frame) {
    final payload = frame
        .split('\n')
        .where((line) => line.startsWith('data:'))
        .map((line) => line.substring(5).trim())
        .join();
    if (payload.isEmpty) return null;
    try {
      final decoded = jsonDecode(payload);
      return decoded is Json ? decoded : null;
    } on FormatException {
      return null;
    }
  }

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
