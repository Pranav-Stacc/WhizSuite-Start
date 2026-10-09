import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/media_repository.dart';
import '../domain/media_asset.dart';

/// The library, newest first.
final mediaAssetsProvider = FutureProvider.autoDispose<List<MediaAsset>>((ref) async {
  final assets = await ref.watch(mediaRepositoryProvider).list();
  return assets..sort((a, b) => b.createdAt.compareTo(a.createdAt));
});

final mediaAssetProvider = FutureProvider.autoDispose.family<MediaAsset, String>(
  (ref, id) => ref.watch(mediaRepositoryProvider).get(id),
);

/// Inline URL for previewing a ready image or video: the list's preview URL when cached, else a fresh signed one.
final mediaPreviewUrlProvider = FutureProvider.autoDispose.family<String?, String>((ref, id) async {
  final asset = await ref.watch(mediaAssetProvider(id).future);
  if (!asset.isReady || !(asset.isImage || asset.isVideo)) return null;
  final cached = ref.read(mediaAssetsProvider).value?.where((a) => a.id == id).firstOrNull?.previewUrl;
  if (cached != null) return cached;
  final url = await ref.watch(mediaRepositoryProvider).downloadUrl(id, MediaDisposition.inline);
  return url.toString();
});

/// Media mutations; each refreshes every view that shows the affected asset.
class MediaActions {
  MediaActions(this._ref);

  final Ref _ref;

  MediaRepository get _repo => _ref.read(mediaRepositoryProvider);

  Future<void> update(String id, MediaAssetUpdate update) async {
    try {
      await _repo.update(id, update);
    } finally {
      _invalidate(id);
    }
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(mediaAssetsProvider);
  }

  /// A short-lived URL to open the file in place or download it.
  Future<Uri> link(String id, MediaDisposition disposition) => _repo.downloadUrl(id, disposition);

  void _invalidate(String id) {
    _ref
      ..invalidate(mediaAssetsProvider)
      ..invalidate(mediaAssetProvider(id))
      ..invalidate(mediaPreviewUrlProvider(id));
  }
}

final mediaActionsProvider = Provider<MediaActions>(MediaActions.new);
