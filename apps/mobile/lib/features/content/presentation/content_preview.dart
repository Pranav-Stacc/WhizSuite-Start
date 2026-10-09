import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/content.dart';
import '../domain/platform_limits.dart';
import 'content_labels.dart';
import 'content_media.dart';

/// Approximate social-post mock-up so reviewers see what will actually publish.
class ContentPreview extends StatefulWidget {
  const ContentPreview({
    required this.clientId,
    required this.clientName,
    required this.contentType,
    required this.platforms,
    required this.caption,
    required this.hashtags,
    required this.media,
    super.key,
  });

  final String clientId;
  final String clientName;
  final String contentType;
  final List<String> platforms;
  final String caption;
  final List<String> hashtags;
  final List<ContentMedia> media;

  @override
  State<ContentPreview> createState() => _ContentPreviewState();
}

class _ContentPreviewState extends State<ContentPreview> {
  static const _mediaAspect = 4 / 5;

  String? _platform;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final platforms = widget.platforms;
    final platform = platforms.contains(_platform) ? _platform : platforms.firstOrNull;
    final limit = platform == null ? null : platformCaptionLimits[platform];
    final full = publishedCaption(widget.caption, widget.hashtags);
    final truncated = limit != null && full.length > limit;
    final shown = truncated ? full.substring(0, limit) : full;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (platforms.length > 1) ...[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final p in platforms) ...[
                  ChoiceChip(
                    avatar: Icon(contentPlatformIcon(p), size: 16),
                    label: Text(contentPlatformLabel(l10n, p)),
                    selected: p == platform,
                    showCheckmark: false,
                    onSelected: (_) => setState(() => _platform = p),
                  ),
                  SizedBox(width: tokens.sm),
                ],
              ],
            ),
          ),
          SizedBox(height: tokens.md),
        ],
        Semantics(
          container: true,
          label: l10n.contentPreviewSemantics(platform == null ? l10n.valueNone : contentPlatformLabel(l10n, platform)),
          child: Card(
            margin: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
                  child: Row(
                    children: [
                      InitialsAvatar(name: widget.clientName, seed: widget.clientId, size: 32),
                      SizedBox(width: tokens.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(widget.clientName, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                            Text(
                              contentTypeLabel(l10n, widget.contentType).toUpperCase(),
                              style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.8),
                            ),
                          ],
                        ),
                      ),
                      if (platform != null) Icon(contentPlatformIcon(platform), color: tokens.secondary),
                    ],
                  ),
                ),
                AspectRatio(
                  aspectRatio: _mediaAspect,
                  child: ContentCarousel(media: widget.media, fallbackIcon: contentTypeIcon(widget.contentType)),
                ),
                Padding(
                  padding: EdgeInsets.all(tokens.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ExcludeSemantics(
                        child: Row(
                          children: [
                            const Icon(Icons.favorite_border, size: 22),
                            SizedBox(width: tokens.md),
                            const Icon(Icons.mode_comment_outlined, size: 22),
                            SizedBox(width: tokens.md),
                            const Icon(Icons.send_outlined, size: 22),
                          ],
                        ),
                      ),
                      SizedBox(height: tokens.md),
                      if (shown.isEmpty)
                        Text(l10n.contentPreviewEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
                      else
                        SelectableText(shown, style: text.bodyMedium?.copyWith(height: 1.45)),
                      if (truncated && platform != null) ...[
                        SizedBox(height: tokens.sm),
                        Text(
                          l10n.contentPreviewTruncated(contentPlatformLabel(l10n, platform), limit),
                          style: text.labelSmall?.copyWith(color: Theme.of(context).colorScheme.error),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
