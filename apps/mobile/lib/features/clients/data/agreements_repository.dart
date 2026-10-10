import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/agreement.dart';

class AgreementsRepository {
  AgreementsRepository(this._api, this._storage);

  final ApiClient _api;
  final Dio _storage;

  String get _base => _api.org('contracts');

  Future<List<Agreement>> list(String clientId) async => jsonList(
        await _api.get<Object?>(_base, query: {'clientId': clientId}),
      ).map(Agreement.fromJson).toList();

  Future<Agreement> create(AgreementInput input) async =>
      Agreement.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<Agreement> markSigned(String id) async => Agreement.fromJson(
        jsonObject(
          await _api.patch<Object?>(
            '$_base/$id',
            body: {'status': AgreementStatuses.signed, 'signedAt': DateTime.now().toUtc().toIso8601String()},
          ),
        ),
      );

  Future<Agreement> sign(String id, {required String signerName}) async => Agreement.fromJson(
        jsonObject(
          await _api.post<Object?>('$_base/$id/sign', body: {'signerName': signerName, 'method': 'TYPED'}),
        ),
      );

  Future<({String uploadUrl, Map<String, String> headers})> presignUpload(
    String id, {
    required String filename,
    required int sizeBytes,
  }) async {
    final raw = jsonObject(
      await _api.post<Object?>(
        '$_base/$id/presign-upload',
        body: {'filename': filename, 'mimeType': 'application/pdf', 'sizeBytes': sizeBytes},
      ),
    );
    final headers = <String, String>{};
    final rawHeaders = raw['headers'];
    if (rawHeaders is Map) {
      for (final entry in rawHeaders.entries) {
        headers['${entry.key}'] = '${entry.value}';
      }
    }
    return (uploadUrl: raw.str('uploadUrl'), headers: headers);
  }

  Future<void> uploadPdf(String uploadUrl, Map<String, String> headers, Uint8List bytes) async {
    try {
      await _storage.put<void>(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {...headers, if (!kIsWeb) Headers.contentLengthHeader: bytes.length},
          responseType: ResponseType.plain,
        ),
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Agreement> completeUpload(String id) async =>
      Agreement.fromJson(jsonObject(await _api.post<Object?>('$_base/$id/complete-upload', body: {})));

  Future<Uri> downloadUrl(String id) async {
    final raw = jsonObject(await _api.get<Object?>('$_base/$id/download'));
    final url = Uri.tryParse(raw.str('url'));
    if (url == null || !url.hasScheme) throw const ApiException(kind: ApiFailureKind.unknown);
    return url;
  }
}

final agreementsRepositoryProvider = Provider<AgreementsRepository>((ref) {
  final config = ref.watch(appConfigProvider);
  final storage = Dio(BaseOptions(connectTimeout: config.connectTimeout));
  ref.onDispose(storage.close);
  return AgreementsRepository(ref.watch(apiClientProvider), storage);
});
