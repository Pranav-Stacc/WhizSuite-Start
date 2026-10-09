import '../domain/media_asset.dart';
import '../domain/mime_types.dart';

/// A local file waiting to be uploaded. [openRead] is called once per attempt so retries re-read it.
class UploadSource {
  const UploadSource({required this.name, required this.sizeBytes, required this.openRead, String? mimeType})
      : _mimeType = mimeType;

  final String name;
  final int sizeBytes;
  final Stream<List<int>> Function() openRead;
  final String? _mimeType;

  String get mimeType => _mimeType ?? mimeTypeForFilename(name);
}

/// The three-step direct upload: presign, transfer bytes to storage, confirm.
abstract interface class MediaUploadPort {
  Future<PresignedUpload> presign({
    required String filename,
    required String mimeType,
    required int sizeBytes,
    String? clientId,
  });

  Future<void> send(PresignedUpload upload, UploadSource source, {required void Function(int sent, int total) onProgress});

  Future<MediaAsset> complete(String id);
}
