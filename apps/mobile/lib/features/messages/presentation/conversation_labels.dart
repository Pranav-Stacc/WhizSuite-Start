import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/messages_providers.dart';
import '../domain/feedback_models.dart';

StatusTone conversationTone(String status) =>
    status == FeedbackThreadStatuses.open ? StatusTone.info : StatusTone.neutral;

/// Display name of a conversation: the client for staff, the agency for portal members,
/// and a generic label for feedback on a post (threads carry no title).
String conversationTitle(WidgetRef ref, AppLocalizations l10n, Conversation conversation) {
  final subject = conversation.subject;
  if (subject.type == FeedbackSubjectTypes.content) return l10n.messagesContentConversation;
  final isPortal = ref.watch(messagesPortalClientProvider).value != null;
  if (isPortal) return l10n.messagesAgencyConversation;
  return ref.watch(clientDirectoryProvider).value?.nameOf(subject.id) ?? l10n.messagesClientConversation;
}

/// Resolves comment authors: "You", a known member, or the agency for portal members
/// who cannot look up staff.
class AuthorNames {
  AuthorNames(WidgetRef ref, this._l10n)
      : _me = ref.watch(sessionProvider).value?.userId,
        _isPortal = ref.watch(messagesPortalClientProvider).value != null,
        _members = ref.watch(memberDirectoryProvider).value;

  final AppLocalizations _l10n;
  final String? _me;
  final bool _isPortal;
  final Directory? _members;

  bool isMine(FeedbackComment comment) => comment.pending || (_me != null && comment.authorId == _me);

  String of(FeedbackComment comment) {
    if (isMine(comment)) return _l10n.messagesYou;
    final known = _members?.nameOf(comment.authorId);
    return known ?? (_isPortal ? _l10n.messagesAgency : _l10n.valueUnknown);
  }
}
