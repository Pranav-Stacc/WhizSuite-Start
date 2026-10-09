import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/chat_models.dart';

/// Chat rooms and messages. Permissions follow the API's `@RequirePermissions`:
/// reads need chat.view, sends need chat.send, room creation needs chat.create_room.
class MessagesRepository {
  MessagesRepository(this._api);

  final ApiClient _api;

  String get _rooms => _api.org('chat/rooms');

  /// chat.view — newest activity first.
  Future<List<ChatRoom>> rooms() async =>
      jsonList(await _api.get<Object?>(_rooms)).map(ChatRoom.fromJson).toList();

  /// chat.view
  Future<ChatRoom> room(String roomId) async =>
      ChatRoom.fromJson(jsonObject(await _api.get<Object?>('$_rooms/$roomId')));

  /// chat.view — oldest first within each page.
  Future<ChatMessagePage> messages(String roomId, {String? cursor}) async => ChatMessagePage.fromJson(
        jsonObject(await _api.get<Object?>('$_rooms/$roomId/messages', query: {'cursor': cursor})),
      );

  /// chat.send
  Future<ChatMessage> send(
    String roomId,
    String body, {
    List<ChatMention> mentions = const [],
    String? replyToId,
  }) async =>
      ChatMessage.fromJson(
        jsonObject(
          await _api.post<Object?>(
            '$_rooms/$roomId/messages',
            body: {
              'body': body,
              if (mentions.isNotEmpty) 'mentions': mentions.map((m) => m.toJson()).toList(),
              if (replyToId != null) 'replyToId': replyToId,
            },
          ),
        ),
      );

  /// chat.create_room — opens or returns an existing DM.
  Future<ChatRoom> openDm(String userId) async =>
      ChatRoom.fromJson(jsonObject(await _api.post<Object?>(_api.org('chat/dms'), body: {'userId': userId})));

  /// chat.create_room — group with members.
  Future<ChatRoom> createGroup({required String name, required List<String> memberUserIds}) async =>
      ChatRoom.fromJson(
        jsonObject(
          await _api.post<Object?>(
            _rooms,
            body: {'type': ChatRoomTypes.group, 'name': name, 'memberUserIds': memberUserIds},
          ),
        ),
      );

  /// chat.view — get or create the client room.
  Future<ChatRoom> clientRoom(String clientId) async => ChatRoom.fromJson(
        jsonObject(await _api.get<Object?>(_api.org('chat/clients/$clientId/room'))),
      );

  /// chat.view — marks messages read through [messageId].
  Future<void> markRead(String roomId, String messageId) =>
      _api.post<Object?>('$_rooms/$roomId/read', body: {'messageId': messageId});
}

final messagesRepositoryProvider = Provider<MessagesRepository>(
  (ref) => MessagesRepository(ref.watch(apiClientProvider)),
);
