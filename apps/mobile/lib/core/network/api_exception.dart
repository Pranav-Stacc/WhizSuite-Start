import 'dart:io';

import 'package:dio/dio.dart';

import '../contracts/contracts.g.dart';

enum ApiFailureKind { offline, timeout, unauthorized, forbidden, notFound, conflict, validation, rateLimited, server, unknown }

/// A failed API call normalised from RFC 7807 Problem Details or a transport error.
class ApiException implements Exception {
  const ApiException({
    required this.kind,
    this.status,
    this.code,
    this.title,
    this.detail,
  });

  factory ApiException.fromDio(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const ApiException(kind: ApiFailureKind.timeout);
      case DioExceptionType.connectionError:
        return const ApiException(kind: ApiFailureKind.offline);
      case DioExceptionType.badResponse:
        return ApiException._fromResponse(error.response);
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
        return const ApiException(kind: ApiFailureKind.unknown);
      case DioExceptionType.unknown:
        if (error.error is SocketException) {
          return const ApiException(kind: ApiFailureKind.offline);
        }
        return const ApiException(kind: ApiFailureKind.unknown);
    }
  }

  factory ApiException._fromResponse(Response<dynamic>? response) {
    final status = response?.statusCode;
    final body = response?.data;
    final problem = body is Map<String, dynamic> ? body : const <String, dynamic>{};
    return ApiException(
      kind: _kindFor(status, problem['code'] as String?),
      status: status,
      code: problem['code'] as String?,
      title: problem['title'] as String?,
      detail: problem['detail'] as String?,
    );
  }

  final ApiFailureKind kind;
  final int? status;
  final String? code;
  final String? title;
  final String? detail;

  bool get isRetryable =>
      kind == ApiFailureKind.offline || kind == ApiFailureKind.timeout || kind == ApiFailureKind.server;

  static ApiFailureKind _kindFor(int? status, String? code) {
    if (code == ErrorCodes.validationFailed) return ApiFailureKind.validation;
    return switch (status) {
      401 => ApiFailureKind.unauthorized,
      403 => ApiFailureKind.forbidden,
      404 => ApiFailureKind.notFound,
      409 => ApiFailureKind.conflict,
      400 || 422 => ApiFailureKind.validation,
      429 => ApiFailureKind.rateLimited,
      final s? when s >= 500 => ApiFailureKind.server,
      _ => ApiFailureKind.unknown,
    };
  }

  @override
  String toString() => 'ApiException($kind, status: $status, code: $code)';
}
