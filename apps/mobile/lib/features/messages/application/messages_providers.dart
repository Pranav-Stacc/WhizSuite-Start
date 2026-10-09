import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../data/messages_repository.dart';
import '../domain/feedback_models.dart';

/// Client id a portal member is scoped to, or null for staff.
/// Portal members without a client id see nothing rather than everything.
final messagesPortalClientProvider = FutureProvider.autoDispose<String?>((ref) async {
  final session = await ref.watch(sessionProvider.future);
  if (session == null || !session.isClientPortal) return null;
  return session.clientId ?? '';
});

/// Threads the member may see. The API lists every thread of the organization, so a
/// portal member's list is narrowed to their client here as defence in depth.
final messageThreadsProvider = FutureProvider.autoDispose<List<FeedbackThread>>((ref) async {
  final repository = ref.watch(messagesRepositoryProvider);
  final portalClientId = await ref.watch(messagesPortalClientProvider.future);
  final threads = await repository.threads();
  if (portalClientId == null) return threads;
  final canReadContent = ref.watch(accessPolicyProvider).can(Permissions.contentView);
  final contentIds = canReadContent ? await repository.contentIds() : const <String>{};
  return visibleThreads(threads, portalClientId: portalClientId, portalContentIds: contentIds);
});

final messageConversationsProvider = FutureProvider.autoDispose<List<Conversation>>(
  (ref) async => groupConversations(await ref.watch(messageThreadsProvider.future)),
);

/// The conversation a thread belongs to; falls back to the single thread when it is
/// older than the listed window.
final conversationProvider = FutureProvider.autoDispose.family<Conversation, String>((ref, threadId) async {
  final conversations = await ref.watch(messageConversationsProvider.future);
  final listed = conversations.where((c) => c.contains(threadId)).firstOrNull;
  if (listed != null) return listed;
  final thread = await ref.watch(messagesRepositoryProvider).thread(threadId);
  final portalClientId = await ref.watch(messagesPortalClientProvider.future);
  final visible = visibleThreads([thread], portalClientId: portalClientId);
  if (visible.isEmpty) throw const ApiException(kind: ApiFailureKind.notFound);
  return Conversation(visible);
});

/// Comments of one subject, oldest first, with optimistic sending.
final subjectCommentsProvider =
    AsyncNotifierProvider.autoDispose.family<SubjectComments, List<FeedbackComment>, FeedbackSubject>(
  SubjectComments.new,
);

class SubjectComments extends AsyncNotifier<List<FeedbackComment>> {
  SubjectComments(this.subject);

  final FeedbackSubject subject;

  @override
  Future<List<FeedbackComment>> build() => ref.watch(messagesRepositoryProvider).comments(subject);

  /// Shows [body] immediately; replaces it with the saved comment, or removes it and
  /// rethrows so the caller can restore the draft.
  Future<void> send(String body) async {
    final text = body.trim();
    if (text.isEmpty) return;
    final me = ref.read(sessionProvider).value?.userId ?? '';
    final draft = FeedbackComment(
      id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
      authorId: me,
      body: text,
      createdAt: DateTime.now(),
      pending: true,
    );
    List<FeedbackComment> without() => [for (final c in state.value ?? const <FeedbackComment>[]) if (c.id != draft.id) c];
    state = AsyncData([...?state.value, draft]);
    try {
      final saved = await ref.read(messagesRepositoryProvider).addComment(subject, text);
      state = AsyncData([...without(), saved]);
    } catch (_) {
      state = AsyncData(without());
      rethrow;
    }
    // Posting can open a new thread or reopen the conversation.
    ref.invalidate(messageThreadsProvider);
  }
}

/// Resolve and reopen. The API gates thread updates with feedback.create.
class MessagesActions {
  MessagesActions(this._ref);

  final Ref _ref;

  MessagesRepository get _repository => _ref.read(messagesRepositoryProvider);

  /// Resolves every open thread of the conversation.
  Future<void> resolve(Conversation conversation) async {
    await Future.wait([
      for (final id in conversation.openThreadIds) _repository.setStatus(id, FeedbackThreadStatuses.resolved),
    ]);
    _ref.invalidate(messageThreadsProvider);
  }

  /// Reopens the most recent thread; new messages then land in it.
  Future<void> reopen(Conversation conversation) async {
    await _repository.setStatus(conversation.latest.id, FeedbackThreadStatuses.open);
    _ref.invalidate(messageThreadsProvider);
  }

  /// Starts (or continues) the conversation about [subject]; returns its route key.
  Future<String?> start(FeedbackSubject subject, String body) async {
    final repository = _repository;
    await repository.addComment(subject, body.trim());
    _ref.invalidate(messageThreadsProvider);
    final threads = await repository.threads();
    return groupConversations(threads).where((c) => c.subject == subject).firstOrNull?.id;
  }
}

final messagesActionsProvider = Provider<MessagesActions>(MessagesActions.new);

/// Feedback has no realtime event yet; a new notification is the closest signal that a
/// conversation changed.
final messagesRealtimeProvider = StreamProvider.autoDispose<RealtimeEvent>(
  (ref) => ref.watch(realtimeClientProvider).events.where((e) => e.name == RealtimeEvents.notificationCreated),
);
