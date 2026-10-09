import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../application/messages_providers.dart';
import '../domain/feedback_models.dart';
import 'conversation_labels.dart';

/// One conversation in the list: name, status, last message preview and time.
class ConversationTile extends ConsumerWidget {
  const ConversationTile({required this.conversation, required this.onTap, this.selected = false, super.key});

  static const _avatarSize = 36.0;
  static const _minHeight = 64.0;
  static const _selectedAlpha = 0.08;

  final Conversation conversation;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final title = conversationTitle(ref, l10n, conversation);
    final comments = ref.watch(subjectCommentsProvider(conversation.subject));
    final last = comments.value?.lastOrNull;
    final names = AuthorNames(ref, l10n);
    final preview = switch (comments) {
      AsyncValue(value: final list?) when list.isEmpty => l10n.messagesNoMessages,
      AsyncValue(hasError: true, value: null) => l10n.messagesPreviewUnavailable,
      _ when last != null => l10n.messagesPreview(names.of(last), last.body),
      _ => null,
    };
    final at = last?.createdAt ?? conversation.updatedAt;
    final status = l10n.messagesStatus(conversation.status);
    final isContent = conversation.subject.type == FeedbackSubjectTypes.content;
    final isOpen = conversation.isOpen;

    return Semantics(
      button: true,
      selected: selected,
      label: [title, status, ?preview, if (at != null) formats.relative(at)].join(', '),
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
                    isContent
                        ? Container(
                            width: _avatarSize,
                            height: _avatarSize,
                            decoration: BoxDecoration(
                              color: tokens.subtle,
                              borderRadius: tokens.borderRadius,
                              border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                            ),
                            child: Icon(Icons.article_outlined, size: 18, color: tokens.muted),
                          )
                        : InitialsAvatar(name: title, seed: conversation.subject.id, size: _avatarSize),
                    SizedBox(width: tokens.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              if (isOpen)
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
                                    fontWeight: isOpen ? FontWeight.w600 : FontWeight.w500,
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
                          Row(
                            children: [
                              Expanded(
                                child: preview == null
                                    ? const SizedBox.shrink()
                                    : Text(
                                        preview,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: text.bodySmall?.copyWith(color: tokens.muted, height: 1.3),
                                      ),
                              ),
                              SizedBox(width: tokens.sm),
                              StatusBadge(label: status, tone: conversationTone(conversation.status), dense: true),
                            ],
                          ),
                        ],
                      ),
                    ),
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
