import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/conversation.dart';
import 'inbox_labels.dart';

/// Inbox row: author with platform mark, latest message, triage badges, time and assignee.
class ConversationTile extends StatelessWidget {
  const ConversationTile({
    required this.conversation,
    required this.onTap,
    this.clientName,
    this.assigneeName,
    this.selected = false,
    super.key,
  });

  static const _avatarSize = 40.0;
  static const _markSize = 18.0;
  static const _assigneeSize = 20.0;
  static const _selectedAlpha = 0.06;

  final InboxConversation conversation;
  final VoidCallback onTap;
  final String? clientName;
  final String? assigneeName;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final author = conversation.authorHandle ?? l10n.inboxUnknownAuthor;
    final time = context.formats.relative(conversation.updatedAt);
    final unread = conversation.isOpen;
    final assignee = assigneeName;
    final meta = [clientName, inboxTypeLabel(l10n, conversation.type)].whereType<String>().join(' · ');

    final card = SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.all(tokens.md),
      semanticLabel: l10n.inboxRowLabel(author, inboxStatusLabel(l10n, conversation.status), time),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox.square(
            dimension: _avatarSize + tokens.xs,
            child: Stack(
              children: [
                InitialsAvatar(name: author, seed: author, size: _avatarSize),
                PositionedDirectional(
                  end: 0,
                  bottom: 0,
                  child: _SourceMark(conversation: conversation, size: _markSize),
                ),
              ],
            ),
          ),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        author,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleSmall?.copyWith(
                          fontWeight: unread ? FontWeight.w600 : FontWeight.w500,
                          color: unread ? tokens.fg : tokens.secondary,
                        ),
                      ),
                    ),
                    SizedBox(width: tokens.sm),
                    Text(time, style: text.labelSmall?.copyWith(color: tokens.muted)),
                  ],
                ),
                SizedBox(height: tokens.xs),
                Text(
                  conversation.preview ?? l10n.inboxNoPreview,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodySmall?.copyWith(color: tokens.muted, height: 1.35),
                ),
                SizedBox(height: tokens.sm),
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: tokens.xs + 2,
                        runSpacing: tokens.xs,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (meta.isNotEmpty) Text(meta, style: text.labelSmall?.copyWith(color: tokens.muted)),
                          if (conversation.sentiment != null)
                            StatusBadge(
                              label: inboxSentimentLabel(l10n, conversation.sentiment),
                              tone: inboxSentimentTone(conversation.sentiment),
                              dense: true,
                            ),
                          if (isElevatedPriority(conversation.priority))
                            StatusBadge(
                              label: inboxPriorityLabel(l10n, conversation.priority),
                              tone: inboxPriorityTone(conversation.priority),
                              dense: true,
                            ),
                          if (!conversation.isOpen)
                            StatusBadge(
                              label: inboxStatusLabel(l10n, conversation.status),
                              tone: inboxStatusTone(conversation.status),
                              dense: true,
                            ),
                        ],
                      ),
                    ),
                    if (assignee != null)
                      Tooltip(
                        message: assignee,
                        child: InitialsAvatar(name: assignee, size: _assigneeSize),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
    if (!selected) return card;
    return Semantics(
      selected: true,
      child: DecoratedBox(
        position: DecorationPosition.foreground,
        decoration: BoxDecoration(
          color: tokens.primary.withValues(alpha: _selectedAlpha),
          border: Border.all(color: tokens.primary),
          borderRadius: BorderRadius.circular(tokens.radius + 6),
        ),
        child: card,
      ),
    );
  }
}

/// Small round badge with the platform (when known) or conversation type icon.
class _SourceMark extends StatelessWidget {
  const _SourceMark({required this.conversation, required this.size});

  final InboxConversation conversation;
  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final platform = conversation.platform;
    return Tooltip(
      message: platform == null ? inboxTypeLabel(l10n, conversation.type) : inboxPlatformLabel(l10n, platform),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: tokens.surface,
          shape: BoxShape.circle,
          border: Border.all(color: tokens.border),
        ),
        child: Icon(
          platform == null ? inboxTypeIcon(conversation.type) : inboxPlatformIcon(platform),
          size: size * 0.6,
          color: tokens.secondary,
        ),
      ),
    );
  }
}
