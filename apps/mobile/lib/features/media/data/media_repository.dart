import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../application/media_upload_port.dart';
import '../domain/media_asset.dart';

class MediaRepository implements MediaUploadPort {
  MediaRepository(this._api, this._storage);

  final ApiClient _api;

  /// Unauthenticated client for presigned storage URLs; our bearer token must never reach the bucket.
  final Dio _storage;

  String get _base => _api.org('media/assets');

  Future<List<MediaAsset>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(MediaAsset.fromJson).toList();

  Future<MediaAsset> get(String id) async => MediaAsset.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  @override
  Future<PresignedUpload> presign({
    required String filename,
    required String mimeType,
    required int sizeBytes,
    String? clientId,
  }) async =>
      PresignedUpload.fromJson(
        jsonObject(
          await _api.post<Object?>(
            '$_base/presign',
            body: {'filename': filename, 'mimeType': mimeType, 'sizeBytes': sizeBytes, 'clientId': ?clientId},
          ),
        ),
      );

  @override
  Future<void> send(PresignedUpload upload, UploadSource source, {required void Function(int sent, int total) onProgress}) async {
    try {
      await _storage.request<void>(
        upload.uploadUrl,
        data: source.openRead(),
        options: Options(
          method: upload.method,
          // Browsers set Content-Length themselves and reject it as an unsafe header.
          headers: {...upload.headers, if (!kIsWeb) Headers.contentLengthHeader: source.sizeBytes},
          responseType: ResponseType.plain,
        ),
        onSendProgress: onProgress,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  @override
  Future<MediaAsset> complete(String id) async =>
      MediaAsset.fromJson(jsonObject(await _api.post<Object?>('$_base/$id/complete')));

  Future<Uri> downloadUrl(String id, MediaDisposition disposition) async {
    final raw = jsonObject(await _api.get<Object?>('$_base/$id/download-url', query: {'disposition': disposition.value}));
    final url = Uri.tryParse(raw.str('url'));
    if (url == null || !url.hasScheme) throw const ApiException(kind: ApiFailureKind.unknown);
    return url;
  }

  Future<MediaAsset> update(String id, MediaAssetUpdate update) async =>
      MediaAsset.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: update.toJson())));

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');
}

final mediaRepositoryProvider = Provider<MediaRepository>((ref) {
  final config = ref.watch(appConfigProvider);
  final storage = Dio(BaseOptions(connectTimeout: config.connectTimeout));
  ref.onDispose(storage.close);
  return MediaRepository(ref.watch(apiClientProvider), storage);
});
