import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/messages/domain/chat_models.dart';
import 'package:flutter_test/flutter_test.dart';

ChatRoom _room({
  required String id,
  String type = ChatRoomTypes.client,
  DateTime? lastMessageAt,
  int unreadCount = 0,
}) =>
    ChatRoom(
      id: id,
      type: type,
      lastMessageAt: lastMessageAt ?? DateTime.utc(2026, 10, 9),
      unreadCount: unreadCount,
    );

void main() {
  group('sortRoomsByActivity', () {
    test('orders rooms by most recent message', () {
      final rooms = sortRoomsByActivity([
        _room(id: 'r1', lastMessageAt: DateTime.utc(2026, 10, 1)),
        _room(id: 'r2', lastMessageAt: DateTime.utc(2026, 10, 8)),
        _room(id: 'r3', lastMessageAt: DateTime.utc(2026, 10, 9)),
      ]);

      expect(rooms.map((r) => r.id), ['r3', 'r2', 'r1']);
    });
  });

  group('groupMessagesByDay', () {
    test('buckets messages by local calendar day including Whiz system replies', () {
      final messages = [
        ChatMessage(
          id: '1',
          roomId: 'r1',
          senderId: 'a',
          type: ChatMessageTypes.text,
          body: 'Hi',
          createdAt: DateTime(2026, 10, 8, 23),
        ),
        ChatMessage(
          id: 'sys',
          roomId: 'r1',
          senderId: '',
          type: ChatMessageTypes.system,
          body: 'Joined',
          createdAt: DateTime(2026, 10, 8, 23, 30),
        ),
        ChatMessage(
          id: '2',
          roomId: 'r1',
          senderId: 'a',
          type: ChatMessageTypes.text,
          body: 'There',
          createdAt: DateTime(2026, 10, 9, 1),
        ),
      ];
      final groups = groupMessagesByDay(messages);
      expect(groups, hasLength(2));
      expect(groups.first.messages.map((m) => m.id), ['1', 'sys']);
      expect(groups.last.messages.map((m) => m.id), ['2']);
    });
  });

  group('ChatRoom.fromJson', () {
    test('reads preview and unread count from chat room payloads', () {
      final room = ChatRoom.fromJson({
        'id': 'room-1',
        'type': ChatRoomTypes.client,
        'clientId': 'c1',
        'lastMessagePreview': 'Hello',
        'lastMessageAt': '2026-10-09T12:00:00.000Z',
        'unreadCount': 3,
        'viewerCanPost': true,
      });

      expect(room.id, 'room-1');
      expect(room.lastMessagePreview, 'Hello');
      expect(room.unreadCount, 3);
      expect(room.hasUnread, isTrue);
    });
  });
}
