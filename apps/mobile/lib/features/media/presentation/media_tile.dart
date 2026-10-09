import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/media_asset.dart';
import 'asset_thumbnail.dart';
import 'media_labels.dart';

/// Grid tile: preview on top, name and facts underneath.
class MediaTile extends StatelessWidget {
  const MediaTile({required this.asset, required this.onTap, this.clientName, this.selected, super.key});

  final MediaAsset asset;
  final VoidCallback onTap;
  final String? clientName;

  /// Non-null in selection mode; shows a check overlay.
  final bool? selected;

  static const _checkSize = 18.0;
  static const _overlayAlpha = 0.85;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final kind = mediaKindLabel(l10n, asset.kind);
    final facts = [kind, formats.fileSize(asset.sizeBytes), ?clientName].join(' · ');
    final isSelected = selected ?? false;
    final scheme = Theme.of(context).colorScheme;

    return Semantics(
      selected: selected,
      child: SurfaceCard(
        padding: EdgeInsets.zero,
        onTap: onTap,
        semanticLabel: l10n.mediaTileSemantics(asset.name, kind, l10n.mediaStatus(asset.status)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(tokens.radius)),
                    child: AssetThumbnail(asset: asset),
                  ),
                  PositionedDirectional(top: tokens.sm, start: tokens.sm, child: MediaStatusBadge(asset: asset)),
                  if (selected != null)
                    PositionedDirectional(
                      top: tokens.sm,
                      end: tokens.sm,
                      child: AnimatedContainer(
                        duration: AppMotion.fast,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected ? scheme.primary : scheme.surface.withValues(alpha: _overlayAlpha),
                          border: Border.all(color: isSelected ? scheme.primary : tokens.border, width: 2),
                        ),
                        padding: const EdgeInsets.all(2),
                        child: Icon(Icons.check, size: _checkSize, color: isSelected ? scheme.onPrimary : Colors.transparent),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.all(tokens.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(asset.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  SizedBox(height: tokens.xs),
                  Text(
                    facts,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.labelSmall?.copyWith(color: tokens.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
