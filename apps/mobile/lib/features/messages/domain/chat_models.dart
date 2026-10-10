import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A chat room as `GET chat/rooms` returns it.
class ChatRoom {
  const ChatRoom({
    required this.id,
    required this.type,
    this.name,
    this.clientId,
    this.lastMessageAt,
    this.lastMessagePreview,
    this.lastMessageId,
    this.unreadCount = 0,
    this.viewerCanPost = true,
    this.updatedAt,
  });

  factory ChatRoom.fromJson(Json json) => ChatRoom(
        id: json.str('id'),
        type: json.str('type', ChatRoomTypes.client),
        name: json.strOrNull('name'),
        clientId: json.strOrNull('clientId'),
        lastMessageAt: json.date('lastMessageAt'),
        lastMessagePreview: json.strOrNull('lastMessagePreview'),
        lastMessageId: json.strOrNull('lastMessageId'),
        unreadCount: json.integer('unreadCount'),
        viewerCanPost: json.flag('viewerCanPost', true),
        updatedAt: json.date('updatedAt') ?? json.date('lastMessageAt') ?? json.date('createdAt'),
      );

  final String id;
  final String type;
  final String? name;
  final String? clientId;
  final DateTime? lastMessageAt;
  final String? lastMessagePreview;
  final String? lastMessageId;
  final int unreadCount;
  final bool viewerCanPost;
  final DateTime? updatedAt;

  bool get hasUnread => unreadCount > 0;
  bool get isClientRoom => type == ChatRoomTypes.client;
  bool get isDm => type == ChatRoomTypes.dm;
  bool get isGroup => type == ChatRoomTypes.group;
}

class ChatMention {
  const ChatMention({
    required this.type,
    required this.targetId,
    required this.displayText,
    this.startOffset,
    this.endOffset,
  });

  factory ChatMention.fromJson(Json json) => ChatMention(
        type: json.str('type', ChatMentionTypes.user),
        targetId: json.str('targetId'),
        displayText: json.str('displayText'),
        startOffset: json.integerOrNull('startOffset'),
        endOffset: json.integerOrNull('endOffset'),
      );

  final String type;
  final String targetId;
  final String displayText;
  final int? startOffset;
  final int? endOffset;

  Map<String, Object?> toJson() => {
        'type': type,
        'targetId': targetId,
        'displayText': displayText,
        if (startOffset != null) 'startOffset': startOffset,
        if (endOffset != null) 'endOffset': endOffset,
      };
}

/// One message in a room. [pending] marks an optimistic local copy.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.roomId,
    required this.senderId,
    required this.type,
    required this.body,
    required this.createdAt,
    this.pending = false,
    this.replyToId,
    this.replyPreview,
    this.deletedAt,
    this.mentions = const [],
  });

  factory ChatMessage.fromJson(Json json) => ChatMessage(
        id: json.str('id'),
        roomId: json.str('roomId'),
        senderId: json.strOrNull('senderId') ?? '',
        type: json.str('type', ChatMessageTypes.text),
        body: json.str('body'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
        replyToId: json.strOrNull('replyToId'),
        replyPreview: json.strOrNull('replyPreview'),
        deletedAt: json.date('deletedAt'),
        mentions: json.objects('mentions').map(ChatMention.fromJson).toList(),
      );

  final String id;
  final String roomId;
  final String senderId;
  final String type;
  final String body;
  final DateTime createdAt;
  final bool pending;
  final String? replyToId;
  final String? replyPreview;
  final DateTime? deletedAt;
  final List<ChatMention> mentions;

  bool get isSystem => type == ChatMessageTypes.system;
  bool get isDeleted => deletedAt != null;
}

/// Cursor page of room messages (`GET chat/rooms/:roomId/messages`).
class ChatMessagePage {
  const ChatMessagePage({required this.items, this.nextCursor, this.hasMore = false});

  factory ChatMessagePage.fromJson(Json json) {
    final next = json.strOrNull('nextCursor');
    return ChatMessagePage(
      items: json.objects('items').map(ChatMessage.fromJson).toList(),
      nextCursor: next,
      hasMore: json.flag('hasMore', next != null) && next != null,
    );
  }

  final List<ChatMessage> items;
  final String? nextCursor;
  final bool hasMore;
}

class MentionCandidate {
  const MentionCandidate({required this.id, required this.label, this.type = ChatMentionTypes.user});

  final String id;
  final String label;
  final String type;
}

/// Extract @mentions from body text using known candidates (case-insensitive labels).
List<ChatMention> extractMentions(String body, List<MentionCandidate> candidates) {
  final mentions = <ChatMention>[];
  for (final candidate in candidates) {
    final pattern = RegExp('@${RegExp.escape(candidate.label)}', caseSensitive: false);
    for (final match in pattern.allMatches(body)) {
      final index = match.start;
      final end = match.end;
      final beforeOk = index == 0 || RegExp(r'''[\s(\[{"']''').hasMatch(body[index - 1]);
      final afterOk = end == body.length || RegExp(r'''[\s)\]},.!?;:"']''').hasMatch(body[end]);
      if (beforeOk && afterOk) {
        mentions.add(
          ChatMention(
            type: candidate.type,
            targetId: candidate.id,
            displayText: candidate.label,
            startOffset: index,
            endOffset: end,
          ),
        );
      }
    }
  }
  return mentions;
}

/// Rooms sorted by most recent activity first.
List<ChatRoom> sortRoomsByActivity(Iterable<ChatRoom> rooms) {
  final sorted = rooms.toList()
    ..sort((a, b) {
      final at = a.lastMessageAt ?? a.updatedAt;
      final bt = b.lastMessageAt ?? b.updatedAt;
      if (at == null || bt == null) return (bt == null ? 0 : 1) - (at == null ? 0 : 1);
      return bt.compareTo(at);
    });
  return sorted;
}

/// Messages bucketed by local calendar day, preserving order.
List<({DateTime day, List<ChatMessage> messages})> groupMessagesByDay(List<ChatMessage> messages) {
  final groups = <({DateTime day, List<ChatMessage> messages})>[];
  for (final message in messages) {
    final local = message.createdAt.toLocal();
    final day = DateTime(local.year, local.month, local.day);
    if (groups.isEmpty || groups.last.day != day) groups.add((day: day, messages: []));
    groups.last.messages.add(message);
  }
  return groups;
}
