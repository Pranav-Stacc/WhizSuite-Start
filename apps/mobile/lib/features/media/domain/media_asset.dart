import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

const _imagePrefix = 'image/';
const _videoPrefix = 'video/';

/// Library bucket for a MIME type ([AssetKinds]); anything not image/video is a document.
String assetKindOf(String mimeType) {
  final mime = mimeType.toLowerCase();
  if (mime.startsWith(_imagePrefix)) return AssetKinds.image;
  if (mime.startsWith(_videoPrefix)) return AssetKinds.video;
  return AssetKinds.document;
}

/// A file in the organisation's media library.
class MediaAsset {
  const MediaAsset({
    required this.id,
    required this.name,
    required this.mimeType,
    required this.sizeBytes,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.clientId,
    this.folderId,
    this.createdById,
    this.previewUrl,
    this.version = 1,
    this.tags = const [],
  });

  factory MediaAsset.fromJson(Json json) {
    final created = json.date('createdAt') ?? DateTime.now();
    final status = json.str('status');
    return MediaAsset(
      id: json.str('id'),
      name: json.str('name'),
      mimeType: json.str('mimeType'),
      sizeBytes: json.integer('sizeBytes'),
      status: MediaAssetStatuses.values.contains(status) ? status : MediaAssetStatuses.pendingUpload,
      clientId: json.strOrNull('clientId'),
      folderId: json.strOrNull('folderId'),
      createdById: json.strOrNull('createdById'),
      previewUrl: json.strOrNull('previewUrl'),
      version: json.integer('currentVersion', 1),
      tags: json.strings('tags'),
      createdAt: created,
      updatedAt: json.date('updatedAt') ?? created,
    );
  }

  final String id;
  final String name;
  final String mimeType;
  final int sizeBytes;

  /// One of [MediaAssetStatuses].
  final String status;
  final String? clientId;
  final String? folderId;
  final String? createdById;

  /// Short-lived inline URL; only the list endpoint returns it, and only for ready images and videos.
  final String? previewUrl;
  final int version;

  /// Not exposed by the API today; read tolerantly so search picks them up once it is.
  final List<String> tags;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get kind => assetKindOf(mimeType);
  bool get isReady => status == MediaAssetStatuses.ready;
  bool get isImage => kind == AssetKinds.image;
  bool get isVideo => kind == AssetKinds.video;

  /// Lower-case file extension without the dot, or empty.
  String get extension {
    final dot = name.lastIndexOf('.');
    return dot < 0 || dot == name.length - 1 ? '' : name.substring(dot + 1).toLowerCase();
  }

  bool matches(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return name.toLowerCase().contains(q) || tags.any((tag) => tag.toLowerCase().contains(q));
  }

  MediaAsset withPreview(String? url) => MediaAsset(
        id: id,
        name: name,
        mimeType: mimeType,
        sizeBytes: sizeBytes,
        status: status,
        createdAt: createdAt,
        updatedAt: updatedAt,
        clientId: clientId,
        folderId: folderId,
        createdById: createdById,
        previewUrl: url,
        version: version,
        tags: tags,
      );
}

/// Presigned direct-to-storage upload returned by `POST media/assets/presign`.
class PresignedUpload {
  const PresignedUpload({
    required this.asset,
    required this.uploadUrl,
    required this.method,
    required this.headers,
    required this.expiresAt,
  });

  factory PresignedUpload.fromJson(Json json, {DateTime? now}) {
    final issued = now ?? DateTime.now();
    final headers = json.object('headers') ?? const <String, dynamic>{};
    return PresignedUpload(
      asset: MediaAsset.fromJson(json.object('asset') ?? const <String, dynamic>{}),
      uploadUrl: json.str('uploadUrl'),
      method: json.str('method', _defaultMethod),
      headers: {for (final e in headers.entries) if (e.value != null) e.key: '${e.value}'},
      expiresAt: issued.add(Duration(seconds: json.integer('expiresInSeconds'))),
    );
  }

  static const _defaultMethod = 'PUT';

  final MediaAsset asset;
  final String uploadUrl;
  final String method;
  final Map<String, String> headers;
  final DateTime expiresAt;

  /// Whether the URL can still be used, leaving [margin] for the transfer to start.
  bool isUsable(DateTime now, {Duration margin = const Duration(seconds: 30)}) => now.add(margin).isBefore(expiresAt);
}

/// Editable asset metadata (`PATCH media/assets/:id`); a null client unassigns it.
class MediaAssetUpdate {
  const MediaAssetUpdate({required this.name, required this.clientId});

  final String name;
  final String? clientId;

  Json toJson() => {'name': name.trim(), 'clientId': clientId};
}

/// Which URL `GET :id/download-url` returns: open in place or save as a file.
enum MediaDisposition {
  inline('inline'),
  attachment('attachment');

  const MediaDisposition(this.value);

  final String value;
}
