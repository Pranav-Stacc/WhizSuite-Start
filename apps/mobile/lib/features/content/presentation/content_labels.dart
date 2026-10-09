import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String contentStatusLabel(AppLocalizations l10n, String status) => l10n.contentStatus(status);

StatusTone contentStatusTone(String status) => switch (status) {
      ContentStatuses.inReview => StatusTone.warning,
      ContentStatuses.changesRequested => StatusTone.danger,
      ContentStatuses.approved => StatusTone.success,
      ContentStatuses.scheduled => StatusTone.info,
      ContentStatuses.published => StatusTone.violet,
      _ => StatusTone.neutral,
    };

String contentTypeLabel(AppLocalizations l10n, String type) => l10n.contentType(type);

IconData contentTypeIcon(String type) => switch (type) {
      ContentTypes.carousel => Icons.view_carousel_outlined,
      ContentTypes.reel => Icons.movie_filter_outlined,
      ContentTypes.story => Icons.amp_stories_outlined,
      ContentTypes.video => Icons.videocam_outlined,
      ContentTypes.article => Icons.article_outlined,
      _ => Icons.image_outlined,
    };

String contentPlatformLabel(AppLocalizations l10n, String platform) => l10n.contentPlatform(platform);

IconData contentPlatformIcon(String platform) => switch (platform) {
      Platforms.instagram => Icons.camera_alt_outlined,
      Platforms.facebook => Icons.facebook,
      Platforms.linkedin => Icons.work_outline,
      Platforms.x => Icons.alternate_email,
      Platforms.youtube => Icons.smart_display_outlined,
      Platforms.tiktok => Icons.music_note_outlined,
      _ => Icons.public,
    };

/// Neutral platform chip with the network's icon.
class PlatformChip extends StatelessWidget {
  const PlatformChip({required this.platform, super.key});

  final String platform;

  @override
  Widget build(BuildContext context) =>
      TagChip(label: contentPlatformLabel(AppLocalizations.of(context), platform), icon: contentPlatformIcon(platform));
}

class ContentStatusBadge extends StatelessWidget {
  const ContentStatusBadge({required this.status, this.dense = false, super.key});

  final String status;
  final bool dense;

  @override
  Widget build(BuildContext context) => StatusBadge(
        label: contentStatusLabel(AppLocalizations.of(context), status),
        tone: contentStatusTone(status),
        dense: dense,
      );
}
