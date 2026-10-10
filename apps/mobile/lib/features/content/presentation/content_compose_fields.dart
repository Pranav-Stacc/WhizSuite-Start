import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../l10n/app_localizations.dart';
import '../../media/presentation/asset_picker.dart';
import '../domain/content.dart';
import '../domain/platform_limits.dart';
import 'content_labels.dart';
import 'content_media.dart';

/// Compact multi-select of networks via a dropdown sheet; flags disconnected accounts.
class PlatformPicker extends StatelessWidget {
  const PlatformPicker({required this.options, required this.selected, required this.connected, required this.onChanged, super.key});

  final List<String> options;
  final List<String> selected;

  /// Null while unknown (no client yet or still loading).
  final Set<String>? connected;
  final ValueChanged<List<String>> onChanged;

  Future<void> _open(BuildContext context) async {
    final next = await showModalBottomSheet<List<String>>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => _PlatformSheet(options: options, selected: selected, connected: connected),
    );
    if (next != null) onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final summary = selected.isEmpty
        ? l10n.contentPlatformsSelect
        : selected.map((p) => contentPlatformLabel(l10n, p)).join(', ');
    return InkWell(
      onTap: () => _open(context),
      borderRadius: context.tokens.borderRadius,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: l10n.contentFieldPlatforms,
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        isEmpty: selected.isEmpty,
        child: Row(
          children: [
            if (selected.isNotEmpty) ...[
              Icon(contentPlatformIcon(selected.first), size: 18, color: context.tokens.muted),
              SizedBox(width: context.tokens.sm),
            ],
            Expanded(
              child: Text(
                summary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: selected.isEmpty
                    ? Theme.of(context).textTheme.bodyLarge?.copyWith(color: context.tokens.muted)
                    : Theme.of(context).textTheme.bodyLarge,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlatformSheet extends StatefulWidget {
  const _PlatformSheet({required this.options, required this.selected, required this.connected});

  final List<String> options;
  final List<String> selected;
  final Set<String>? connected;

  @override
  State<_PlatformSheet> createState() => _PlatformSheetState();
}

class _PlatformSheetState extends State<_PlatformSheet> {
  late List<String> _selected = [...widget.selected];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final known = widget.connected;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.lg),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(l10n.contentFieldPlatforms, style: Theme.of(context).textTheme.titleMedium),
              ),
              SizedBox(height: tokens.sm),
              Text(l10n.contentPlatformsHint, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
              SizedBox(height: tokens.md),
              for (final platform in widget.options)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  secondary: Icon(contentPlatformIcon(platform)),
                  title: Text(
                    known != null && !known.contains(platform)
                        ? l10n.contentPlatformNotConnected(contentPlatformLabel(l10n, platform))
                        : contentPlatformLabel(l10n, platform),
                  ),
                  value: _selected.contains(platform),
                  onChanged: (on) => setState(() {
                    _selected = on == true
                        ? [..._selected, platform]
                        : _selected.where((p) => p != platform).toList();
                  }),
                ),
              SizedBox(height: tokens.md),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(_selected),
                child: Text(l10n.mediaUploadDone),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ordered media strip with add (library picker), reorder and remove.
class ContentMediaField extends ConsumerWidget {
  const ContentMediaField({required this.clientId, required this.media, required this.onChanged, super.key});

  final String? clientId;
  final List<ContentMedia> media;
  final ValueChanged<List<ContentMedia>> onChanged;

  static const _thumb = 96.0;

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final owner = clientId;
    if (owner == null) {
      showToast(context, l10n.contentMediaPickClientFirst);
      return;
    }
    final picked = await showAssetPicker(
      context,
      ref,
      clientId: owner,
      maxSelection: contentMediaMaxDefault - media.length,
      exclude: {for (final m in media) m.assetId},
    );
    if (picked == null || picked.isEmpty) return;
    onChanged([
      ...media,
      for (final asset in picked)
        ContentMedia(assetId: asset.id, name: asset.name, mimeType: asset.mimeType, url: asset.previewUrl),
    ]);
  }

  void _move(int from, int to) {
    if (to < 0 || to >= media.length) return;
    final next = [...media];
    next.insert(to, next.removeAt(from));
    onChanged(next);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final full = media.length >= contentMediaMaxDefault;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Text(l10n.contentMediaCount(media.length, contentMediaMaxDefault), style: text.labelLarge)),
            TextButton.icon(
              onPressed: full ? null : () => _add(context, ref),
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: Text(l10n.contentMediaAdd),
            ),
          ],
        ),
        SizedBox(height: tokens.sm),
        if (media.isEmpty)
          Text(l10n.contentMediaEmpty, style: text.bodySmall?.copyWith(color: tokens.muted))
        else
          SizedBox(
            height: _thumb + tokens.md,
            child: ReorderableListView.builder(
              scrollDirection: Axis.horizontal,
              buildDefaultDragHandles: false,
              itemCount: media.length,
              onReorder: (from, to) => _move(from, to > from ? to - 1 : to),
              itemBuilder: (context, i) {
                final item = media[i];
                return Padding(
                  key: ValueKey(item.assetId),
                  padding: EdgeInsetsDirectional.only(end: tokens.sm),
                  child: Semantics(
                    label: l10n.contentMediaItem(i + 1, media.length, item.name),
                    customSemanticsActions: {
                      if (i > 0) CustomSemanticsAction(label: l10n.contentMediaMoveEarlier): () => _move(i, i - 1),
                      if (i < media.length - 1)
                        CustomSemanticsAction(label: l10n.contentMediaMoveLater): () => _move(i, i + 1),
                    },
                    child: ReorderableDelayedDragStartListener(
                      index: i,
                      child: SizedBox.square(
                        dimension: _thumb,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(borderRadius: tokens.borderRadius, child: ContentMediaThumb(media: item)),
                            PositionedDirectional(
                              top: tokens.xs,
                              start: tokens.xs,
                              child: _Pill(label: '${i + 1}'),
                            ),
                            PositionedDirectional(
                              top: 0,
                              end: 0,
                              child: IconButton.filledTonal(
                                visualDensity: VisualDensity.compact,
                                tooltip: l10n.valueRemove(item.name),
                                icon: const Icon(Icons.close, size: 16),
                                onPressed: () => onChanged(media.where((m) => m.assetId != item.assetId).toList()),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        if (media.length > 1) ...[
          SizedBox(height: tokens.xs),
          Text(l10n.contentMediaReorderHint, style: text.labelSmall?.copyWith(color: tokens.muted)),
        ],
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  static const _alpha = 0.6;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ExcludeSemantics(
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: _alpha),
          borderRadius: BorderRadius.circular(tokens.radius),
        ),
        child: Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white)),
      ),
    );
  }
}

/// Tappable suggestion chips (brand pillars, brand hashtags) that hide once used.
class SuggestionChips extends StatelessWidget {
  const SuggestionChips({required this.label, required this.suggestions, required this.onPick, super.key});

  final String label;
  final List<String> suggestions;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return const SizedBox.shrink();
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted)),
        SizedBox(height: tokens.xs),
        Wrap(
          spacing: tokens.sm,
          runSpacing: tokens.sm,
          children: [
            for (final value in suggestions)
              ActionChip(
                avatar: const Icon(Icons.add, size: 16),
                label: Text(value),
                tooltip: l10n.valueAdd,
                onPressed: () => onPick(value),
              ),
          ],
        ),
      ],
    );
  }
}
