import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class StorageUsage {
  const StorageUsage({
    required this.usedBytes,
    required this.limitBytes,
    required this.assetCount,
    required this.ratio,
  });

  factory StorageUsage.fromJson(Json json) => StorageUsage(
        usedBytes: json.integer('usedBytes'),
        limitBytes: json.integerOrNull('limitBytes'),
        assetCount: json.integer('assetCount'),
        ratio: json.decimal('ratio'),
      );

  final int usedBytes;
  final int? limitBytes;
  final int assetCount;
  final double ratio;

  bool get isUnlimited => limitBytes == null;
}

class MediaDataSource {
  const MediaDataSource({
    required this.id,
    required this.kind,
    required this.name,
    required this.status,
    this.connectionId,
    this.connectedAt,
    this.metadata = const {},
  });

  factory MediaDataSource.fromJson(Json json) => MediaDataSource(
        id: json.str('id'),
        kind: json.str('kind'),
        name: json.str('name'),
        status: json.str('status'),
        connectionId: json.strOrNull('connectionId'),
        connectedAt: json.date('connectedAt'),
        metadata: json.object('metadata') ?? const {},
      );

  final String id;
  final String kind;
  final String name;
  final String status;
  final String? connectionId;
  final DateTime? connectedAt;
  final Map<String, dynamic> metadata;

  bool get isPlatform => kind == 'platform';
  bool get isGoogleDrive => kind == 'google_drive';
  bool get isConnected => status == 'CONNECTED';
}

class ExportJob {
  const ExportJob({
    required this.id,
    required this.kind,
    required this.status,
    required this.progress,
    this.downloadUrl,
    this.error,
    required this.createdAt,
    this.completedAt,
  });

  factory ExportJob.fromJson(Json json) => ExportJob(
        id: json.str('id'),
        kind: json.str('kind'),
        status: json.str('status'),
        progress: json.integer('progress'),
        downloadUrl: json.strOrNull('downloadUrl'),
        error: json.strOrNull('error'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
        completedAt: json.date('completedAt'),
      );

  final String id;
  final String kind;
  final String status;
  final int progress;
  final String? downloadUrl;
  final String? error;
  final DateTime createdAt;
  final DateTime? completedAt;

  bool get isReady => status == 'READY';
  bool get isFailed => status == 'FAILED';
  bool get isRunning => status == 'RUNNING' || status == 'QUEUED';
}
