import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class InboxMessage {
  const InboxMessage({
    required this.id,
    required this.direction,
    required this.body,
    required this.createdAt,
    this.authorId,
    this.pending = false,
  });

  factory InboxMessage.fromJson(Json json) {
    final direction = json.str('direction');
    return InboxMessage(
      id: json.str('id'),
      direction: InboxMessageDirections.values.contains(direction) ? direction : InboxMessageDirections.inbound,
      body: json.str('body'),
      createdAt: json.date('createdAt') ?? DateTime.now(),
      authorId: json.strOrNull('authorId'),
    );
  }

  /// A reply shown before the API confirms it.
  factory InboxMessage.pending({required String body, String? authorId, DateTime? at}) => InboxMessage(
        id: '$_pendingPrefix${(at ?? DateTime.now()).microsecondsSinceEpoch}',
        direction: InboxMessageDirections.outbound,
        body: body,
        createdAt: at ?? DateTime.now(),
        authorId: authorId,
        pending: true,
      );

  static const _pendingPrefix = 'pending-';

  final String id;
  final String direction;
  final String body;
  final DateTime createdAt;
  final String? authorId;
  final bool pending;

  bool get isOutbound => direction == InboxMessageDirections.outbound;
}

/// A social comment, DM or mention thread routed to the agency for a client.
class InboxConversation {
  const InboxConversation({
    required this.id,
    required this.clientId,
    required this.type,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.sentiment,
    this.authorHandle,
    this.assigneeId,
    this.preview,
    this.platform,
    this.firstResponseAt,
    this.resolvedAt,
    this.messages = const [],
  });

  factory InboxConversation.fromJson(Json json) {
    String pick(String key, List<String> allowed, String fallback) {
      final value = json.str(key);
      return allowed.contains(value) ? value : fallback;
    }

    final sentiment = json.str('sentiment');
    final platform = json.str('platform');
    final createdAt = json.date('createdAt') ?? DateTime.now();
    return InboxConversation(
      id: json.str('id'),
      clientId: json.str('clientId'),
      type: pick('type', InboxConversationTypes.values, InboxConversationTypes.dm),
      status: pick('status', InboxConversationStatuses.values, InboxConversationStatuses.open),
      priority: pick('priority', InboxPriorities.values, InboxPriorities.normal),
      sentiment: InboxSentiments.values.contains(sentiment) ? sentiment : null,
      authorHandle: json.strOrNull('authorHandle'),
      assigneeId: json.strOrNull('assigneeId'),
      preview: json.strOrNull('preview'),
      platform: Platforms.values.contains(platform) ? platform : null,
      firstResponseAt: json.date('firstResponseAt'),
      resolvedAt: json.date('resolvedAt'),
      createdAt: createdAt,
      updatedAt: json.date('updatedAt') ?? createdAt,
      messages: json.objects('messages').map(InboxMessage.fromJson).toList(),
    );
  }

  final String id;
  final String clientId;
  final String type;
  final String status;
  final String priority;
  final String? sentiment;
  final String? authorHandle;
  final String? assigneeId;

  /// Body of the latest message.
  final String? preview;

  /// Source network when the API provides it (not yet part of the conversation DTO).
  final String? platform;
  final DateTime? firstResponseAt;
  final DateTime? resolvedAt;
  final DateTime createdAt;

  /// Last activity; lists sort by this.
  final DateTime updatedAt;

  /// Only loaded on the detail endpoint.
  final List<InboxMessage> messages;

  bool get isOpen => status == InboxConversationStatuses.open;
  bool get isArchived => status == InboxConversationStatuses.archived;

  InboxConversation withReply(InboxMessage message) => InboxConversation(
        id: id,
        clientId: clientId,
        type: type,
        status: InboxConversationStatuses.replied,
        priority: priority,
        sentiment: sentiment,
        authorHandle: authorHandle,
        assigneeId: assigneeId ?? message.authorId,
        preview: message.body,
        platform: platform,
        firstResponseAt: firstResponseAt ?? message.createdAt,
        resolvedAt: resolvedAt,
        createdAt: createdAt,
        updatedAt: message.createdAt,
        messages: [...messages, message],
      );
}

/// List filters; every set criterion must match.
class InboxFilter {
  const InboxFilter({
    this.query = '',
    this.status = InboxConversationStatuses.open,
    this.type,
    this.sentiment,
    this.priority,
    this.clientId,
    this.assignedToMe = false,
  });

  final String query;
  final String? status;
  final String? type;
  final String? sentiment;
  final String? priority;
  final String? clientId;
  final bool assignedToMe;

  /// True when anything beyond the default status narrows the list.
  bool get narrowed =>
      query.trim().isNotEmpty ||
      type != null ||
      sentiment != null ||
      priority != null ||
      clientId != null ||
      assignedToMe;

  /// Everything except the status, so status chips can show their counts.
  bool matchesScope(InboxConversation conversation, {String? userId}) {
    if (!matchesInboxQuery(conversation, query)) return false;
    if (type != null && conversation.type != type) return false;
    if (sentiment != null && conversation.sentiment != sentiment) return false;
    if (priority != null && conversation.priority != priority) return false;
    if (clientId != null && conversation.clientId != clientId) return false;
    return !assignedToMe || (userId != null && conversation.assigneeId == userId);
  }

  bool matches(InboxConversation conversation, {String? userId}) =>
      (status == null || conversation.status == status) && matchesScope(conversation, userId: userId);

  InboxFilter copyWith({
    String? query,
    String? Function()? status,
    String? Function()? type,
    String? Function()? sentiment,
    String? Function()? priority,
    String? Function()? clientId,
    bool? assignedToMe,
  }) =>
      InboxFilter(
        query: query ?? this.query,
        status: status == null ? this.status : status(),
        type: type == null ? this.type : type(),
        sentiment: sentiment == null ? this.sentiment : sentiment(),
        priority: priority == null ? this.priority : priority(),
        clientId: clientId == null ? this.clientId : clientId(),
        assignedToMe: assignedToMe ?? this.assignedToMe,
      );
}

/// Case-insensitive search over the author handle and latest message.
bool matchesInboxQuery(InboxConversation conversation, String query) {
  final q = query.trim().toLowerCase();
  return q.isEmpty ||
      (conversation.authorHandle?.toLowerCase().contains(q) ?? false) ||
      (conversation.preview?.toLowerCase().contains(q) ?? false);
}

/// Newest activity first.
int byLatestActivity(InboxConversation a, InboxConversation b) => b.updatedAt.compareTo(a.updatedAt);

/// Messages split into local calendar days, oldest first, for day separators in a thread.
List<({DateTime day, List<InboxMessage> messages})> groupByDay(List<InboxMessage> messages) {
  final sorted = [...messages]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  final groups = <({DateTime day, List<InboxMessage> messages})>[];
  for (final message in sorted) {
    final local = message.createdAt.toLocal();
    final day = DateTime(local.year, local.month, local.day);
    if (groups.isEmpty || groups.last.day != day) {
      groups.add((day: day, messages: [message]));
    } else {
      groups.last.messages.add(message);
    }
  }
  return groups;
}

/// Fields a conversation PATCH may change. [assigneeId] uses a thunk so `null` can unassign.
class ConversationChange {
  const ConversationChange({this.status, this.priority, this.sentiment, this.assigneeId});

  final String? status;
  final String? priority;
  final String? sentiment;
  final String? Function()? assigneeId;

  Json toJson() => {
        'status': ?status,
        'priority': ?priority,
        'sentiment': ?sentiment,
        if (assigneeId case final assignee?) 'assigneeId': assignee(),
      };
}
