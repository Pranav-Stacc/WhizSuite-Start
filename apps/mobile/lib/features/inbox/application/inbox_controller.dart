import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/session_controller.dart';
import '../data/inbox_repository.dart';
import '../domain/conversation.dart';

final conversationsProvider = FutureProvider.autoDispose<List<InboxConversation>>(
  (ref) => ref.watch(inboxRepositoryProvider).list(),
);

/// One thread with its messages. Replies appear immediately and are rolled back if the API rejects them.
class ConversationController extends AsyncNotifier<InboxConversation> {
  ConversationController(this.conversationId);

  final String conversationId;

  InboxRepository get _repo => ref.read(inboxRepositoryProvider);

  @override
  Future<InboxConversation> build() => ref.watch(inboxRepositoryProvider).get(conversationId);

  Future<void> reply(String body, {String? authorId}) async {
    final previous = state.value;
    if (previous != null) state = AsyncData(previous.withReply(InboxMessage.pending(body: body, authorId: authorId)));
    try {
      final saved = await _repo.reply(conversationId, body);
      if (ref.mounted) state = AsyncData(saved);
    } catch (_) {
      if (ref.mounted && previous != null) state = AsyncData(previous);
      rethrow;
    }
  }

  Future<void> change(ConversationChange change) async {
    final saved = await _repo.update(conversationId, change);
    if (ref.mounted) state = AsyncData(saved);
  }
}

final conversationProvider =
    AsyncNotifierProvider.autoDispose.family<ConversationController, InboxConversation, String>(
  ConversationController.new,
);

/// Conversation mutations; each refreshes the list so status, preview and assignee stay in sync.
class InboxActions {
  InboxActions(this._ref);

  final Ref _ref;

  Future<void> reply(String id, String body) async {
    final authorId = _ref.read(sessionProvider).value?.userId;
    await _ref.read(conversationProvider(id).notifier).reply(body, authorId: authorId);
    _ref.invalidate(conversationsProvider);
  }

  Future<void> update(String id, ConversationChange change) async {
    await _ref.read(conversationProvider(id).notifier).change(change);
    _ref.invalidate(conversationsProvider);
  }
}

final inboxActionsProvider = Provider<InboxActions>(InboxActions.new);
