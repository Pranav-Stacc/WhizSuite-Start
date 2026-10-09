import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/inbox/domain/conversation.dart';
import 'package:flutter_test/flutter_test.dart';

InboxConversation _conversation(
  String id, {
  String status = InboxConversationStatuses.open,
  String type = InboxConversationTypes.comment,
  String? sentiment,
  String priority = InboxPriorities.normal,
  String clientId = 'c1',
  String? assigneeId,
  String? handle,
  String? preview,
  DateTime? updatedAt,
}) =>
    InboxConversation(
      id: id,
      clientId: clientId,
      type: type,
      status: status,
      priority: priority,
      sentiment: sentiment,
      assigneeId: assigneeId,
      authorHandle: handle,
      preview: preview,
      createdAt: DateTime.utc(2026),
      updatedAt: updatedAt ?? DateTime.utc(2026),
    );

void main() {
  group('InboxConversation.fromJson', () {
    test('reads the detail DTO with messages', () {
      final conversation = InboxConversation.fromJson({
        'id': 'v1',
        'clientId': 'c1',
        'type': 'DM',
        'status': 'REPLIED',
        'priority': 'HIGH',
        'sentiment': 'NEGATIVE',
        'authorHandle': '@jane',
        'assigneeId': 'u1',
        'preview': 'Thanks!',
        'firstResponseAt': '2026-10-09T10:00:00.000Z',
        'resolvedAt': null,
        'createdAt': '2026-10-09T09:00:00.000Z',
        'updatedAt': '2026-10-09T10:00:00.000Z',
        'messages': [
          {'id': 'm1', 'direction': 'INBOUND', 'body': 'Hi', 'authorId': null, 'createdAt': '2026-10-09T09:00:00.000Z'},
          {'id': 'm2', 'direction': 'OUTBOUND', 'body': 'Thanks!', 'authorId': 'u1', 'createdAt': '2026-10-09T10:00:00.000Z'},
        ],
      });

      expect(conversation.type, InboxConversationTypes.dm);
      expect(conversation.status, InboxConversationStatuses.replied);
      expect(conversation.sentiment, InboxSentiments.negative);
      expect(conversation.platform, isNull);
      expect(conversation.messages.map((m) => m.isOutbound), [false, true]);
      expect(conversation.messages.last.authorId, 'u1');
    });

    test('falls back to safe defaults for the list DTO and unknown values', () {
      final conversation = InboxConversation.fromJson({
        'id': 'v2',
        'clientId': 'c1',
        'type': 'STORY',
        'status': 'NEW',
        'priority': null,
        'sentiment': null,
        'createdAt': '2026-10-09T09:00:00.000Z',
      });
      expect(conversation.type, InboxConversationTypes.dm);
      expect(conversation.status, InboxConversationStatuses.open);
      expect(conversation.priority, InboxPriorities.normal);
      expect(conversation.sentiment, isNull);
      expect(conversation.updatedAt, conversation.createdAt);
      expect(conversation.messages, isEmpty);
    });
  });

  group('InboxFilter', () {
    final items = [
      _conversation('1', handle: '@jane', preview: 'Love it', sentiment: InboxSentiments.positive, assigneeId: 'me'),
      _conversation('2', status: InboxConversationStatuses.archived, type: InboxConversationTypes.dm, clientId: 'c2'),
      _conversation('3', priority: InboxPriorities.urgent, preview: 'Refund please', sentiment: InboxSentiments.negative),
    ];
    List<String> ids(InboxFilter filter) => [for (final c in items) if (filter.matches(c, userId: 'me')) c.id];

    test('defaults to open conversations', () {
      expect(ids(const InboxFilter()), ['1', '3']);
      expect(ids(const InboxFilter(status: null)), ['1', '2', '3']);
    });

    test('searches the author handle and preview', () {
      expect(matchesInboxQuery(items[0], 'JANE'), isTrue);
      expect(matchesInboxQuery(items[2], 'refund'), isTrue);
      expect(matchesInboxQuery(items[1], 'refund'), isFalse);
    });

    test('combines type, sentiment, priority, client and assignee criteria', () {
      expect(ids(const InboxFilter(status: null, type: InboxConversationTypes.dm)), ['2']);
      expect(ids(const InboxFilter(sentiment: InboxSentiments.negative)), ['3']);
      expect(ids(const InboxFilter(priority: InboxPriorities.urgent)), ['3']);
      expect(ids(const InboxFilter(status: null, clientId: 'c2')), ['2']);
      expect(ids(const InboxFilter(assignedToMe: true)), ['1']);
      expect(const InboxFilter(assignedToMe: true).matches(items[0]), isFalse);
    });

    test('scope ignores status so status chips can count', () {
      const filter = InboxFilter(clientId: 'c1');
      expect(items.where((c) => filter.matchesScope(c)).length, 2);
      expect(filter.narrowed, isTrue);
      expect(const InboxFilter().narrowed, isFalse);
    });
  });

  test('sorts by latest activity first', () {
    final sorted = [
      _conversation('old', updatedAt: DateTime.utc(2026, 1, 1)),
      _conversation('new', updatedAt: DateTime.utc(2026, 3, 1)),
      _conversation('mid', updatedAt: DateTime.utc(2026, 2, 1)),
    ]..sort(byLatestActivity);
    expect(sorted.map((c) => c.id), ['new', 'mid', 'old']);
  });

  test('groups messages by local day in chronological order', () {
    InboxMessage message(String id, DateTime at) =>
        InboxMessage(id: id, direction: InboxMessageDirections.inbound, body: id, createdAt: at);
    final groups = groupByDay([
      message('c', DateTime(2026, 10, 9, 18)),
      message('a', DateTime(2026, 10, 8, 9)),
      message('b', DateTime(2026, 10, 9, 8)),
    ]);
    expect(groups.map((g) => g.day), [DateTime(2026, 10, 8), DateTime(2026, 10, 9)]);
    expect(groups.last.messages.map((m) => m.id), ['b', 'c']);
  });

  test('an optimistic reply marks the thread replied and assigns the replier when unassigned', () {
    final at = DateTime.utc(2026, 10, 9, 12);
    final reply = InboxMessage.pending(body: 'On it', authorId: 'me', at: at);
    final updated = _conversation('1').withReply(reply);
    expect(reply.pending, isTrue);
    expect(reply.isOutbound, isTrue);
    expect(updated.status, InboxConversationStatuses.replied);
    expect(updated.assigneeId, 'me');
    expect(updated.preview, 'On it');
    expect(updated.messages.single.id, reply.id);
    expect(updated.updatedAt, at);
  });

  test('ConversationChange serialises only set fields and can explicitly unassign', () {
    expect(const ConversationChange(status: InboxConversationStatuses.archived).toJson(), {'status': 'ARCHIVED'});
    expect(ConversationChange(assigneeId: () => null).toJson(), {'assigneeId': null});
    expect(ConversationChange(assigneeId: () => 'u1').toJson(), {'assigneeId': 'u1'});
  });
}
