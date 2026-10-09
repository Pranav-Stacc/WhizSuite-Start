/// Fallback when a file's type cannot be derived; the API decides whether it is allowed.
const String fallbackMimeType = 'application/octet-stream';

/// Extension → MIME type for files picked from the device (pickers do not report a type).
const Map<String, String> _mimeByExtension = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'heic': 'image/heic',
  'heif': 'image/heif',
  'avif': 'image/avif',
  'bmp': 'image/bmp',
  'svg': 'image/svg+xml',
  'tif': 'image/tiff',
  'tiff': 'image/tiff',
  'mp4': 'video/mp4',
  'm4v': 'video/x-m4v',
  'mov': 'video/quicktime',
  'webm': 'video/webm',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'm4a': 'audio/mp4',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'csv': 'text/csv',
  'txt': 'text/plain',
  'json': 'application/json',
  'zip': 'application/zip',
  'psd': 'image/vnd.adobe.photoshop',
  'ai': 'application/postscript',
};

/// MIME type for [filename] based on its extension, or [fallbackMimeType].
String mimeTypeForFilename(String filename) {
  final dot = filename.lastIndexOf('.');
  if (dot < 0 || dot == filename.length - 1) return fallbackMimeType;
  return _mimeByExtension[filename.substring(dot + 1).toLowerCase()] ?? fallbackMimeType;
}
