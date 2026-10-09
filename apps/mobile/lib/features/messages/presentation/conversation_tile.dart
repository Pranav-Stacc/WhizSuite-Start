import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/chat_models.dart';
import 'conversation_labels.dart';

/// One room in the list: name, last message preview, time and unread indicator.
class ConversationTile extends ConsumerWidget {
  const ConversationTile({required this.room, required this.onTap, this.selected = false, super.key});

  static const _avatarSize = 36.0;
  static const _minHeight = 64.0;
  static const _selectedAlpha = 0.08;

  final ChatRoom room;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final title = roomTitle(ref, l10n, room);
    final preview = room.lastMessagePreview ?? l10n.messagesNoMessages;
    final at = room.lastMessageAt ?? room.updatedAt;
    final unread = room.hasUnread;

    return Semantics(
      button: true,
      selected: selected,
      label: [title, preview, if (at != null) formats.relative(at), if (unread) l10n.portalMessageOpen].join(', '),
      child: ExcludeSemantics(
        child: Material(
          color: selected ? tokens.primary.withValues(alpha: _selectedAlpha) : Colors.transparent,
          borderRadius: tokens.borderRadius,
          child: InkWell(
            onTap: onTap,
            borderRadius: tokens.borderRadius,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: _minHeight),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.sm),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    InitialsAvatar(name: title, seed: room.id, size: _avatarSize),
                    SizedBox(width: tokens.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              if (unread)
                                Padding(
                                  padding: EdgeInsets.only(right: tokens.xs),
                                  child: Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(color: tokens.primary, shape: BoxShape.circle),
                                  ),
                                ),
                              Expanded(
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: text.titleSmall?.copyWith(
                                    fontWeight: unread ? FontWeight.w600 : FontWeight.w500,
                                  ),
                                ),
                              ),
                              if (at != null) ...[
                                SizedBox(width: tokens.sm),
                                Text(formats.relative(at), style: text.labelSmall?.copyWith(color: tokens.muted)),
                              ],
                            ],
                          ),
                          SizedBox(height: tokens.xs),
                          Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodySmall?.copyWith(
                              color: unread ? tokens.fg : tokens.muted,
                              height: 1.3,
                              fontWeight: unread ? FontWeight.w500 : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (unread && room.unreadCount > 0) ...[
                      SizedBox(width: tokens.sm),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 2),
                        decoration: BoxDecoration(
                          color: tokens.primary,
                          borderRadius: BorderRadius.circular(tokens.radius),
                        ),
                        child: Text(
                          room.unreadCount > 99 ? '99+' : '${room.unreadCount}',
                          style: text.labelSmall?.copyWith(color: tokens.onPrimary, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
