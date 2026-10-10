import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/content.dart';
import 'content_labels.dart';
import 'content_media.dart';

class ContentCard extends StatelessWidget {
  const ContentCard({required this.content, required this.onTap, this.clientName, this.onMore, super.key});

  static const _thumbSize = 88.0;
  static const _maxPlatformChips = 3;

  final Content content;
  final String? clientName;
  final VoidCallback onTap;
  final VoidCallback? onMore;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final scheduled = content.scheduledAt;
    final title = content.title.isEmpty ? l10n.contentUntitled : content.title;
    final extraPlatforms = content.platforms.length - _maxPlatformChips;

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: [
        title,
        contentStatusLabel(l10n, content.status),
        contentTypeLabel(l10n, content.contentType),
        ?clientName,
        if (scheduled != null) l10n.contentScheduledFor(formats.dateTime(scheduled)),
      ].join(', '),
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(tokens.radius + 4),
              child: SizedBox.square(
                dimension: _thumbSize,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ContentMediaThumb(media: content.cover, fallbackIcon: contentTypeIcon(content.contentType)),
                    if (content.media.length > 1)
                      PositionedDirectional(
                        top: tokens.xs,
                        end: tokens.xs,
                        child: Icon(Icons.collections_outlined, size: 16, color: Colors.white, shadows: const [Shadow(blurRadius: 4)]),
                      ),
                  ],
                ),
              ),
            ),
            SizedBox(width: tokens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall)),
                      SizedBox(width: tokens.xs),
                      ContentStatusBadge(status: content.status, dense: true),
                      if (onMore != null)
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          tooltip: l10n.moreActions,
                          icon: const Icon(Icons.more_horiz, size: 20),
                          onPressed: onMore,
                        ),
                    ],
                  ),
                  SizedBox(height: tokens.xs),
                  Row(
                    children: [
                      if (clientName != null) ...[
                        InitialsAvatar(name: clientName!, seed: content.clientId, mark: true, size: 18),
                        SizedBox(width: tokens.xs + 2),
                        Flexible(
                          child: Text(
                            clientName!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodySmall?.copyWith(color: tokens.secondary),
                          ),
                        ),
                        Text('  ·  ', style: text.bodySmall?.copyWith(color: tokens.muted)),
                      ],
                      Icon(contentTypeIcon(content.contentType), size: 14, color: tokens.muted),
                      SizedBox(width: tokens.xs),
                      Text(contentTypeLabel(l10n, content.contentType), style: text.bodySmall?.copyWith(color: tokens.muted)),
                    ],
                  ),
                  if (content.caption.isNotEmpty) ...[
                    SizedBox(height: tokens.sm),
                    Text(content.caption, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.bodySmall),
                  ],
                  SizedBox(height: tokens.sm),
                  Wrap(
                    spacing: tokens.xs,
                    runSpacing: tokens.xs,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      for (final platform in content.platforms.take(_maxPlatformChips)) PlatformChip(platform: platform),
                      if (extraPlatforms > 0)
                        Text('+$extraPlatforms', style: text.labelSmall?.copyWith(color: tokens.muted)),
                    ],
                  ),
                  SizedBox(height: tokens.sm),
                  Row(
                    children: [
                      Icon(scheduled == null ? Icons.event_busy_outlined : Icons.event_outlined, size: 14, color: tokens.muted),
                      SizedBox(width: tokens.xs),
                      Expanded(
                        child: Text(
                          scheduled == null ? l10n.contentUnscheduled : formats.dateTime(scheduled),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.labelSmall?.copyWith(color: tokens.muted),
                        ),
                      ),
                      Text(formats.relative(content.updatedAt), style: text.labelSmall?.copyWith(color: tokens.muted)),
                    ],
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
