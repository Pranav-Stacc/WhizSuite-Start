import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/messages_providers.dart';
import '../domain/chat_models.dart';

/// Display name of a room: client name, DM peer, group title, or agency for portal members.
String roomTitle(WidgetRef ref, AppLocalizations l10n, ChatRoom room) {
  if (room.isGroup) return room.name ?? l10n.navMessages;
  if (room.isClientRoom) {
    final isPortal = ref.watch(messagesPortalClientProvider).value != null;
    if (isPortal) return l10n.messagesAgencyConversation;
    final clientId = room.clientId;
    if (clientId != null) {
      return ref.watch(clientDirectoryProvider).value?.nameOf(clientId) ?? l10n.messagesClientConversation;
    }
    return room.name ?? l10n.messagesClientConversation;
  }
  if (room.isDm) {
    final name = room.name;
    if (name != null && name.isNotEmpty) return name;
    return l10n.navMessages;
  }
  return room.name ?? l10n.navMessages;
}

/// Resolves message authors: "You", a known member, or the agency for portal members.
class AuthorNames {
  AuthorNames(WidgetRef ref, this._l10n)
      : _me = ref.watch(sessionProvider).value?.userId,
        _isPortal = ref.watch(messagesPortalClientProvider).value != null,
        _members = ref.watch(memberDirectoryProvider).value;

  final AppLocalizations _l10n;
  final String? _me;
  final bool _isPortal;
  final Directory? _members;

  bool isMine(ChatMessage message) =>
      !message.isSystem && (message.pending || (_me != null && message.senderId == _me));

  String of(ChatMessage message) {
    if (message.isSystem || message.senderId.isEmpty) return _l10n.messagesWhiz;
    if (isMine(message)) return _l10n.messagesYou;
    final known = _members?.nameOf(message.senderId);
    return known ?? (_isPortal ? _l10n.messagesAgency : _l10n.valueUnknown);
  }
}
