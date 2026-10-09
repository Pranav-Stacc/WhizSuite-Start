import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../auth/application/session_controller.dart';
import '../data/media_repository.dart';
import '../domain/media_asset.dart';
import 'media_controller.dart';
import 'media_upload_port.dart';

enum UploadPhase { queued, uploading, finishing, done, failed }

/// Problems caught on the device before anything is sent.
enum UploadIssue { empty, nameTooLong }

/// One file's progress through presign → transfer → complete.
class UploadTask {
  const UploadTask({
    required this.id,
    required this.source,
    this.clientId,
    this.phase = UploadPhase.queued,
    this.sent = 0,
    this.presigned,
    this.asset,
    this.error,
  });

  final String id;
  final UploadSource source;
  final String? clientId;
  final UploadPhase phase;
  final int sent;

  /// Kept so a retry after a failed transfer reuses the same pending asset while the URL is valid.
  final PresignedUpload? presigned;
  final MediaAsset? asset;

  /// An [UploadIssue] or the API failure that stopped the upload.
  final Object? error;

  double get progress => switch (phase) {
        UploadPhase.done || UploadPhase.finishing => 1,
        _ when source.sizeBytes <= 0 => 0,
        _ => (sent / source.sizeBytes).clamp(0, 1).toDouble(),
      };

  bool get isActive => phase == UploadPhase.uploading || phase == UploadPhase.finishing;
  bool get isFinished => phase == UploadPhase.done || phase == UploadPhase.failed;

  UploadTask copyWith({
    UploadPhase? phase,
    int? sent,
    PresignedUpload? presigned,
    MediaAsset? asset,
    Object? error,
    bool clearError = false,
  }) =>
      UploadTask(
        id: id,
        source: source,
        clientId: clientId,
        phase: phase ?? this.phase,
        sent: sent ?? this.sent,
        presigned: presigned ?? this.presigned,
        asset: asset ?? this.asset,
        error: clearError ? null : error ?? this.error,
      );
}

/// Validation applied before presigning; the server still enforces type and size limits.
UploadIssue? uploadIssueFor(UploadSource source) {
  if (source.sizeBytes <= 0) return UploadIssue.empty;
  if (source.name.length > mediaFilenameMaxLength) return UploadIssue.nameTooLong;
  return null;
}

final mediaUploadPortProvider = Provider<MediaUploadPort>((ref) => ref.watch(mediaRepositoryProvider));

/// Clock seam so tests can control presign expiry.
final uploadClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// App-wide upload queue: files upload one at a time so progress is meaningful on slow networks,
/// and uploads keep going when the progress sheet is closed. Resets when the signed-in user changes.
class MediaUploadQueue extends Notifier<List<UploadTask>> {
  static const _progressSteps = 100;

  var _sequence = 0;
  var _draining = false;
  Future<void>? _running;

  @override
  List<UploadTask> build() {
    ref.watch(sessionProvider.select((session) => session.value?.userId));
    return const [];
  }

  bool get isBusy => state.any((task) => !task.isFinished);

  /// Queues [sources] and starts uploading. Returns the new task ids.
  List<String> enqueue(Iterable<UploadSource> sources, {String? clientId}) {
    final tasks = [
      for (final source in sources) UploadTask(id: 'upload-${_sequence++}', source: source, clientId: clientId),
    ];
    if (tasks.isEmpty) return const [];
    state = [...state, ...tasks];
    _drain();
    return [for (final task in tasks) task.id];
  }

  void retry(String id) {
    final task = _find(id);
    if (task == null || task.phase != UploadPhase.failed) return;
    _replace(task.copyWith(phase: UploadPhase.queued, sent: 0, clearError: true));
    _drain();
  }

  void retryFailed() {
    for (final task in state.where((t) => t.phase == UploadPhase.failed).toList()) {
      retry(task.id);
    }
  }

  /// Removes finished tasks (and the failed ones the user gave up on).
  void clearFinished() => state = state.where((task) => !task.isFinished).toList();

  /// Completes when every queued task has finished.
  Future<void> drained() => _drain();

  Future<void> _drain() {
    if (_draining) return _running ?? Future.value();
    _draining = true;
    return _running = _loop().whenComplete(() {
      _draining = false;
      if (ref.mounted && state.any((task) => task.phase == UploadPhase.queued)) _drain();
    });
  }

  Future<void> _loop() async {
    while (true) {
      final next = state.where((task) => task.phase == UploadPhase.queued).firstOrNull;
      if (next == null) return;
      await _run(next);
    }
  }

  Future<void> _run(UploadTask task) async {
    final issue = uploadIssueFor(task.source);
    if (issue != null) {
      _replace(task.copyWith(phase: UploadPhase.failed, error: issue));
      return;
    }
    final port = ref.read(mediaUploadPortProvider);
    final now = ref.read(uploadClockProvider);
    var current = task.copyWith(phase: UploadPhase.uploading, sent: 0);
    _replace(current);
    try {
      var presigned = current.presigned;
      if (presigned == null || !presigned.isUsable(now())) {
        presigned = await port.presign(
          filename: task.source.name,
          mimeType: task.source.mimeType,
          sizeBytes: task.source.sizeBytes,
          clientId: task.clientId,
        );
        current = current.copyWith(presigned: presigned);
        _replace(current);
      }
      final size = task.source.sizeBytes;
      var reported = 0;
      await port.send(
        presigned,
        task.source,
        onProgress: (sent, _) {
          final step = size <= 0 ? 0 : sent * _progressSteps ~/ size;
          if (step == reported) return;
          reported = step;
          current = current.copyWith(sent: sent);
          _replace(current);
        },
      );
      current = current.copyWith(phase: UploadPhase.finishing, sent: size);
      _replace(current);
      final asset = await port.complete(presigned.asset.id);
      _replace(current.copyWith(phase: UploadPhase.done, asset: asset));
      ref.invalidate(mediaAssetsProvider);
    } on Object catch (error) {
      _replace(current.copyWith(phase: UploadPhase.failed, error: error));
    }
  }

  UploadTask? _find(String id) => state.where((task) => task.id == id).firstOrNull;

  /// Ignores tasks no longer in the queue (e.g. cleared, or reset by a sign-out).
  void _replace(UploadTask task) {
    if (!ref.mounted) return;
    final index = state.indexWhere((t) => t.id == task.id);
    if (index < 0) return;
    state = [...state]..[index] = task;
  }
}

final mediaUploadQueueProvider = NotifierProvider<MediaUploadQueue, List<UploadTask>>(MediaUploadQueue.new);
