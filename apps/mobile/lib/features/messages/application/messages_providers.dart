import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../auth/application/session_controller.dart';
import '../data/messages_repository.dart';
import '../domain/chat_models.dart';

/// Client id a portal member is scoped to, or null for staff.
final messagesPortalClientProvider = FutureProvider.autoDispose<String?>((ref) async {
  final session = await ref.watch(sessionProvider.future);
  if (session == null || !session.isClientPortal) return null;
  return session.clientId ?? '';
});

/// Rooms the member may see. The API scopes results for portal memberships.
final chatRoomsProvider = FutureProvider.autoDispose<List<ChatRoom>>((ref) async {
  final rooms = await ref.watch(messagesRepositoryProvider).rooms();
  return sortRoomsByActivity(rooms);
});

/// One room by id; falls back to a direct fetch when it is not in the listed window.
final roomProvider = FutureProvider.autoDispose.family<ChatRoom, String>((ref, roomId) async {
  final listed = (await ref.watch(chatRoomsProvider.future)).where((r) => r.id == roomId).firstOrNull;
  if (listed != null) return listed;
  return ref.watch(messagesRepositoryProvider).room(roomId);
});

/// Messages of one room, oldest first, with optimistic sending.
final roomMessagesProvider =
    AsyncNotifierProvider.autoDispose.family<RoomMessages, List<ChatMessage>, String>(RoomMessages.new);

class RoomMessages extends AsyncNotifier<List<ChatMessage>> {
  RoomMessages(this.roomId);

  final String roomId;
  String? _nextCursor;
  bool _hasMore = false;

  bool get hasMore => _hasMore;

  @override
  Future<List<ChatMessage>> build() async {
    ref.listen(messagesRealtimeProvider, (_, next) {
      final event = next.value;
      if (event == null) return;
      final payloadRoomId = _eventRoomId(event);
      if (payloadRoomId == roomId) {
        ref.invalidateSelf();
        ref.invalidate(chatRoomsProvider);
      } else if (event.name == RealtimeEvents.chatRoomUpdated) {
        ref.invalidate(chatRoomsProvider);
      }
    });
    final page = await ref.watch(messagesRepositoryProvider).messages(roomId);
    _nextCursor = page.nextCursor;
    _hasMore = page.hasMore;
    _markLatestRead(page.items);
    return page.items;
  }

  Future<void> loadMore() async {
    final cursor = _nextCursor;
    if (!_hasMore || cursor == null || state.isLoading) return;
    final page = await ref.read(messagesRepositoryProvider).messages(roomId, cursor: cursor);
    _nextCursor = page.nextCursor;
    _hasMore = page.hasMore;
    state = AsyncData([...page.items, ...?state.value]);
  }

  /// Shows [body] immediately; replaces it with the saved message, or removes it and rethrows.
  Future<void> send(
    String body, {
    List<ChatMention> mentions = const [],
    String? replyToId,
    String? replyPreview,
  }) async {
    final text = body.trim();
    if (text.isEmpty) return;
    final me = ref.read(sessionProvider).value?.userId ?? '';
    final draft = ChatMessage(
      id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
      roomId: roomId,
      senderId: me,
      type: ChatMessageTypes.text,
      body: text,
      createdAt: DateTime.now(),
      pending: true,
      replyToId: replyToId,
      replyPreview: replyPreview,
      mentions: mentions,
    );
    List<ChatMessage> without() => [for (final m in state.value ?? const <ChatMessage>[]) if (m.id != draft.id) m];
    state = AsyncData([...?state.value, draft]);
    try {
      final saved = await ref.read(messagesRepositoryProvider).send(
            roomId,
            text,
            mentions: mentions,
            replyToId: replyToId,
          );
      state = AsyncData([...without(), saved]);
      _markLatestRead([saved]);
    } catch (_) {
      state = AsyncData(without());
      rethrow;
    }
    ref.invalidate(chatRoomsProvider);
  }

  void _markLatestRead(List<ChatMessage> messages) {
    final latest = messages.lastOrNull;
    if (latest == null || latest.pending) return;
    ref.read(messagesRepositoryProvider).markRead(roomId, latest.id).then<void>(
      (_) => ref.invalidate(chatRoomsProvider),
      onError: (_) {},
    );
  }
}

/// Opens DMs and client rooms, then sends an optional first message.
class MessagesActions {
  MessagesActions(this._ref);

  final Ref _ref;

  MessagesRepository get _repository => _ref.read(messagesRepositoryProvider);

  Future<ChatRoom> openDm(String userId) => _repository.openDm(userId);

  Future<ChatRoom> openClientRoom(String clientId) => _repository.clientRoom(clientId);

  Future<ChatRoom> createGroup({required String name, required List<String> memberUserIds}) =>
      _repository.createGroup(name: name, memberUserIds: memberUserIds);

  /// Opens a room and optionally sends the first message; returns the room id for routing.
  Future<String> startRoom(ChatRoom room, {String? body}) async {
    final text = body?.trim();
    if (text != null && text.isNotEmpty) {
      await _repository.send(room.id, text);
    }
    _ref.invalidate(chatRoomsProvider);
    return room.id;
  }
}

final messagesActionsProvider = Provider<MessagesActions>(MessagesActions.new);

final messagesRealtimeProvider = StreamProvider.autoDispose<RealtimeEvent>(
  (ref) => ref.watch(realtimeClientProvider).events.where(
        (e) => e.name == RealtimeEvents.chatMessageCreated || e.name == RealtimeEvents.chatRoomUpdated,
      ),
);

String? _eventRoomId(RealtimeEvent event) {
  final payload = event.payload;
  if (payload is Map) {
    final map = payload.cast<String, dynamic>();
    return map['roomId'] as String? ?? map['id'] as String?;
  }
  return null;
}
