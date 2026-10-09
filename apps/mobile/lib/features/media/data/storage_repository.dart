import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/storage_models.dart';

class StorageRepository {
  StorageRepository(this._api);

  final ApiClient _api;

  String _media(String resource) => _api.org('media/$resource');

  Future<StorageUsage> usage() async =>
      StorageUsage.fromJson(jsonObject(await _api.get<Object?>(_media('storage-usage'))));

  Future<List<MediaDataSource>> dataSources() async =>
      jsonList(await _api.get<Object?>(_media('data-sources'))).map(MediaDataSource.fromJson).toList();

  Future<String> beginGoogleDriveConnect() async =>
      jsonObject(await _api.post<Object?>(_media('data-sources/google-drive/connect'))).str('authorizeUrl');

  Future<void> disconnectGoogleDrive(String connectionId) =>
      _api.post<Object?>('${_media('data-sources/google-drive')}/$connectionId/disconnect');

  Future<ExportJob> createZipExport(List<String> assetIds) async => ExportJob.fromJson(
        jsonObject(await _api.post<Object?>(_media('exports/zip'), body: {'assetIds': assetIds})),
      );

  Future<ExportJob> createDriveTransfer({required String connectionId, bool transferAll = false}) async =>
      ExportJob.fromJson(
        jsonObject(
          await _api.post<Object?>(
            _media('exports/drive'),
            body: {'connectionId': connectionId, 'transferAll': transferAll, 'assetIds': <String>[]},
          ),
        ),
      );

  Future<ExportJob> exportJob(String jobId) async =>
      ExportJob.fromJson(jsonObject(await _api.get<Object?>(_media('exports/$jobId'))));

  /// Poll until the job finishes or [attempts] is exhausted.
  Future<ExportJob> waitForJob(String jobId, {int attempts = 40}) async {
    var job = await exportJob(jobId);
    for (var i = 0; i < attempts && job.isRunning; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      job = await exportJob(jobId);
    }
    return job;
  }
}

final storageRepositoryProvider = Provider<StorageRepository>(
  (ref) => StorageRepository(ref.watch(apiClientProvider)),
);
