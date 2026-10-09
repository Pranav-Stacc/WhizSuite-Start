import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String inboxStatusLabel(AppLocalizations l10n, String status) => l10n.inboxStatus(status);

String inboxTypeLabel(AppLocalizations l10n, String type) => l10n.inboxType(type);

String inboxSentimentLabel(AppLocalizations l10n, String? sentiment) => l10n.inboxSentiment(sentiment ?? '');

String inboxPriorityLabel(AppLocalizations l10n, String priority) => l10n.inboxPriority(priority);

String inboxPlatformLabel(AppLocalizations l10n, String platform) => l10n.inboxPlatform(platform);

StatusTone inboxStatusTone(String status) => switch (status) {
      InboxConversationStatuses.open => StatusTone.warning,
      InboxConversationStatuses.replied => StatusTone.success,
      _ => StatusTone.neutral,
    };

StatusTone inboxSentimentTone(String? sentiment) => switch (sentiment) {
      InboxSentiments.positive => StatusTone.success,
      InboxSentiments.negative => StatusTone.danger,
      _ => StatusTone.neutral,
    };

StatusTone inboxPriorityTone(String priority) => switch (priority) {
      InboxPriorities.urgent => StatusTone.danger,
      InboxPriorities.high => StatusTone.warning,
      InboxPriorities.low => StatusTone.neutral,
      _ => StatusTone.info,
    };

IconData inboxTypeIcon(String type) => switch (type) {
      InboxConversationTypes.comment => Icons.mode_comment_outlined,
      InboxConversationTypes.mention => Icons.alternate_email,
      _ => Icons.mail_outline,
    };

IconData inboxPlatformIcon(String? platform) => switch (platform) {
      Platforms.instagram => Icons.camera_alt_outlined,
      Platforms.facebook => Icons.facebook,
      Platforms.linkedin => Icons.work_outline,
      Platforms.x => Icons.tag,
      Platforms.youtube => Icons.smart_display_outlined,
      Platforms.tiktok => Icons.music_note_outlined,
      _ => Icons.public,
    };

/// Priorities worth flagging in a list row; normal and low stay quiet.
bool isElevatedPriority(String priority) =>
    priority == InboxPriorities.high || priority == InboxPriorities.urgent;
