import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A feedback thread as `GET feedback/threads` returns it. Threads carry no title or
/// preview: a conversation is identified by its subject (a client or a content item).
class FeedbackThread {
  const FeedbackThread({
    required this.id,
    required this.subjectType,
    required this.subjectId,
    required this.status,
    required this.visibility,
    this.createdById,
    this.createdAt,
    this.updatedAt,
  });

  factory FeedbackThread.fromJson(Json json) => FeedbackThread(
        id: json.str('id'),
        subjectType: json.str('subjectType', FeedbackSubjectTypes.client),
        subjectId: json.str('subjectId'),
        status: json.str('status', FeedbackThreadStatuses.open),
        visibility: json.str('visibility', Visibilities.clientVisible),
        createdById: json.strOrNull('createdById'),
        createdAt: json.date('createdAt'),
        updatedAt: json.date('updatedAt') ?? json.date('createdAt'),
      );

  final String id;
  final String subjectType;
  final String subjectId;
  final String status;
  final String visibility;
  final String? createdById;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isOpen => status == FeedbackThreadStatuses.open;
}

/// One message of a subject's conversation. [pending] marks an optimistic local copy.
class FeedbackComment {
  const FeedbackComment({
    required this.id,
    required this.authorId,
    required this.body,
    required this.createdAt,
    this.pending = false,
  });

  factory FeedbackComment.fromJson(Json json) => FeedbackComment(
        id: json.str('id'),
        authorId: json.str('authorId'),
        body: json.str('body'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
      );

  final String id;
  final String authorId;
  final String body;
  final DateTime createdAt;
  final bool pending;
}

/// Identifies the subject a conversation is about.
typedef FeedbackSubject = ({String type, String id});

/// Every thread of one subject, newest first. Comments are stored per subject by the
/// API, so the threads of a subject read as one continuous conversation.
class Conversation {
  Conversation(List<FeedbackThread> threads)
      : assert(threads.isNotEmpty, 'A conversation has at least one thread'),
        threads = [...threads]..sort(_newestFirst);

  final List<FeedbackThread> threads;

  static int _newestFirst(FeedbackThread a, FeedbackThread b) {
    final at = a.updatedAt;
    final bt = b.updatedAt;
    if (at == null || bt == null) return (bt == null ? 0 : 1) - (at == null ? 0 : 1);
    return bt.compareTo(at);
  }

  FeedbackThread get latest => threads.first;

  /// Route key: the most recent thread's id.
  String get id => latest.id;

  FeedbackSubject get subject => (type: latest.subjectType, id: latest.subjectId);

  bool get isOpen => threads.any((t) => t.isOpen);

  String get status => isOpen ? FeedbackThreadStatuses.open : FeedbackThreadStatuses.resolved;

  DateTime? get updatedAt => latest.updatedAt;

  List<String> get openThreadIds => [for (final t in threads) if (t.isOpen) t.id];

  bool contains(String threadId) => threads.any((t) => t.id == threadId);
}

/// Groups threads by subject, most recently active conversation first.
List<Conversation> groupConversations(Iterable<FeedbackThread> threads) {
  final bySubject = <FeedbackSubject, List<FeedbackThread>>{};
  for (final thread in threads) {
    if (thread.subjectId.isEmpty) continue;
    bySubject.putIfAbsent((type: thread.subjectType, id: thread.subjectId), () => []).add(thread);
  }
  final conversations = [for (final group in bySubject.values) Conversation(group)];
  conversations.sort((a, b) => Conversation._newestFirst(a.latest, b.latest));
  return conversations;
}

/// Comments bucketed by local calendar day, preserving order.
List<({DateTime day, List<FeedbackComment> comments})> groupCommentsByDay(List<FeedbackComment> comments) {
  final groups = <({DateTime day, List<FeedbackComment> comments})>[];
  for (final comment in comments) {
    final local = comment.createdAt.toLocal();
    final day = DateTime(local.year, local.month, local.day);
    if (groups.isEmpty || groups.last.day != day) groups.add((day: day, comments: []));
    groups.last.comments.add(comment);
  }
  return groups;
}

/// What a client-portal member may see: their own client conversation, internal threads
/// excluded, plus feedback on content that belongs to them. Staff see everything listed.
List<FeedbackThread> visibleThreads(
  Iterable<FeedbackThread> threads, {
  required String? portalClientId,
  Set<String> portalContentIds = const {},
}) {
  if (portalClientId == null) return threads.toList();
  return threads.where((t) {
    if (t.visibility == Visibilities.internal) return false;
    return switch (t.subjectType) {
      FeedbackSubjectTypes.client => t.subjectId == portalClientId,
      FeedbackSubjectTypes.content => portalContentIds.contains(t.subjectId),
      _ => false,
    };
  }).toList();
}
