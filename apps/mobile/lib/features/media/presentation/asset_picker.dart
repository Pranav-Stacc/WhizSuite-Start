import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/media_controller.dart';
import '../domain/media_asset.dart';
import 'media_labels.dart';
import 'media_tile.dart';
import 'upload_sheet.dart';

/// A library asset chosen in [showAssetPicker]. This is the media feature's only public type.
class PickedAsset {
  const PickedAsset({required this.id, required this.name, required this.mimeType, this.previewUrl});

  final String id;
  final String name;
  final String mimeType;

  /// Short-lived inline preview URL when the library had one.
  final String? previewUrl;

  bool get isImage => assetKindOf(mimeType) == AssetKinds.image;
  bool get isVideo => assetKindOf(mimeType) == AssetKinds.video;
}

/// Lets the member pick ready assets (optionally only [clientId]'s) and upload new ones in place.
/// Returns the selection in pick order, or null when dismissed.
Future<List<PickedAsset>?> showAssetPicker(
  BuildContext context,
  WidgetRef ref, {
  String? clientId,
  int? maxSelection,
  Set<String> exclude = const {},
}) =>
    showModalBottomSheet<List<PickedAsset>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => _AssetPicker(clientId: clientId, maxSelection: maxSelection, exclude: exclude),
    );

class _AssetPicker extends ConsumerStatefulWidget {
  const _AssetPicker({required this.clientId, required this.maxSelection, required this.exclude});

  final String? clientId;
  final int? maxSelection;
  final Set<String> exclude;

  @override
  ConsumerState<_AssetPicker> createState() => _AssetPickerState();
}

class _AssetPickerState extends ConsumerState<_AssetPicker> {
  static const _heightFactor = 0.9;
  static const _maxWidth = 960.0;
  static const _minTileWidth = 140.0;
  static const _tileAspect = 0.8;
  static const _maxColumns = 6;

  final List<MediaAsset> _selected = [];
  String _query = '';
  String? _kind;

  bool get _full {
    final max = widget.maxSelection;
    return max != null && _selected.length >= max;
  }

  bool _eligible(MediaAsset asset) =>
      asset.isReady && !widget.exclude.contains(asset.id) && (widget.clientId == null || asset.clientId == widget.clientId);

  void _toggle(MediaAsset asset) {
    final index = _selected.indexWhere((a) => a.id == asset.id);
    setState(() {
      if (index >= 0) {
        _selected.removeAt(index);
      } else if (!_full) {
        _selected.add(asset);
      }
    });
  }

  Future<void> _upload() async {
    final uploaded = await startMediaUpload(context, ref, clientId: widget.clientId);
    if (!mounted) return;
    setState(() {
      for (final asset in uploaded.where((a) => a.isReady && !widget.exclude.contains(a.id))) {
        if (_full) break;
        if (_selected.every((s) => s.id != asset.id)) _selected.add(asset);
      }
    });
  }

  void _confirm() => Navigator.of(context).pop([
        for (final a in _selected) PickedAsset(id: a.id, name: a.name, mimeType: a.mimeType, previewUrl: a.previewUrl),
      ]);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final assets = ref.watch(mediaAssetsProvider);
    final eligible = (assets.value ?? const <MediaAsset>[]).where(_eligible).toList();
    final visible = eligible.where((a) => (_kind == null || a.kind == _kind) && a.matches(_query)).toList();
    final max = widget.maxSelection;

    return SizedBox(
      height: MediaQuery.sizeOf(context).height * _heightFactor,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxWidth),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Semantics(header: true, child: Text(l10n.mediaPickerTitle, style: text.titleLarge)),
                    ),
                    PermissionGate(
                      anyOf: const [Permissions.filesUpload],
                      child: TextButton.icon(
                        onPressed: _upload,
                        icon: const Icon(Icons.upload_outlined),
                        label: Text(l10n.mediaUpload),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: tokens.md),
                SearchField(hint: l10n.mediaSearch, onChanged: (q) => setState(() => _query = q)),
                SizedBox(height: tokens.sm),
                FilterBar<String>(
                  options: AssetKinds.values,
                  selected: _kind,
                  labelOf: (kind) => mediaKindLabel(l10n, kind),
                  onSelected: (kind) => setState(() => _kind = kind),
                ),
                SizedBox(height: tokens.md),
                Expanded(
                  child: switch (assets) {
                    AsyncValue(:final error?) when assets.value == null =>
                      ErrorState(error: error, onRetry: () => ref.invalidate(mediaAssetsProvider)),
                    _ when assets.value == null => const _GridSkeleton(),
                    _ when eligible.isEmpty => EmptyState(
                        icon: Icons.photo_library_outlined,
                        title: l10n.mediaPickerEmpty,
                        body: l10n.mediaPickerEmptyBody,
                      ),
                    _ when visible.isEmpty => EmptyState(icon: Icons.search_off, title: l10n.searchNoMatches),
                    _ => LayoutBuilder(
                        builder: (context, constraints) => GridView.builder(
                          itemCount: visible.length,
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: _maxColumns),
                            mainAxisSpacing: tokens.md,
                            crossAxisSpacing: tokens.md,
                            childAspectRatio: _tileAspect,
                          ),
                          itemBuilder: (context, i) {
                            final asset = visible[i];
                            return MediaTile(
                              asset: asset,
                              selected: _selected.any((s) => s.id == asset.id),
                              onTap: () => _toggle(asset),
                            );
                          },
                        ),
                      ),
                  },
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: tokens.md),
                    child: Row(
                      children: [
                        Expanded(
                          child: Semantics(
                            liveRegion: true,
                            child: Text(
                              max == null
                                  ? l10n.mediaPickerSelected(_selected.length)
                                  : l10n.mediaPickerSelectedOf(_selected.length, max),
                              style: text.bodyMedium?.copyWith(color: tokens.muted),
                            ),
                          ),
                        ),
                        TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(l10n.cancel)),
                        SizedBox(width: tokens.sm),
                        FilledButton(
                          onPressed: _selected.isEmpty ? null : _confirm,
                          child: Text(l10n.mediaPickerConfirm(_selected.length)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GridSkeleton extends StatelessWidget {
  const _GridSkeleton();

  static const _tiles = 6;
  static const _tileHeight = 160.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Shimmer(
      child: Wrap(
        spacing: tokens.md,
        runSpacing: tokens.md,
        children: [
          for (var i = 0; i < _tiles; i++)
            const SizedBox(width: _AssetPickerState._minTileWidth, child: SkeletonBox(height: _tileHeight)),
        ],
      ),
    );
  }
}
