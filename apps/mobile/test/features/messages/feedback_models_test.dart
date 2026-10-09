import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/messages/domain/feedback_models.dart';
import 'package:flutter_test/flutter_test.dart';

FeedbackThread _thread({
  required String id,
  String subjectType = FeedbackSubjectTypes.client,
  String subjectId = 'c1',
  String status = FeedbackThreadStatuses.open,
  String visibility = Visibilities.clientVisible,
  DateTime? updatedAt,
}) =>
    FeedbackThread(
      id: id,
      subjectType: subjectType,
      subjectId: subjectId,
      status: status,
      visibility: visibility,
      updatedAt: updatedAt ?? DateTime.utc(2026, 10, 9),
    );

void main() {
  group('groupConversations', () {
    test('groups threads by subject and orders by newest activity', () {
      final conversations = groupConversations([
        _thread(id: 't1', subjectId: 'c1', updatedAt: DateTime.utc(2026, 10, 1)),
        _thread(id: 't2', subjectId: 'c2', updatedAt: DateTime.utc(2026, 10, 8)),
        _thread(id: 't3', subjectId: 'c1', updatedAt: DateTime.utc(2026, 10, 9)),
      ]);

      expect(conversations.map((c) => c.subject.id), ['c1', 'c2']);
      expect(conversations.first.id, 't3');
      expect(conversations.first.threads.map((t) => t.id), ['t3', 't1']);
    });

    test('skips threads with an empty subject id', () {
      expect(groupConversations([_thread(id: 't1', subjectId: '')]), isEmpty);
    });
  });

  group('visibleThreads', () {
    test('staff see every listed thread', () {
      final threads = [
        _thread(id: 't1'),
        _thread(id: 't2', visibility: Visibilities.internal),
      ];
      expect(visibleThreads(threads, portalClientId: null), threads);
    });

    test('portal members only see their client and owned content, never internal', () {
      final threads = [
        _thread(id: 'own', subjectId: 'c1'),
        _thread(id: 'other', subjectId: 'c2'),
        _thread(id: 'internal', subjectId: 'c1', visibility: Visibilities.internal),
        _thread(
          id: 'post',
          subjectType: FeedbackSubjectTypes.content,
          subjectId: 'post-1',
        ),
        _thread(
          id: 'other-post',
          subjectType: FeedbackSubjectTypes.content,
          subjectId: 'post-2',
        ),
      ];

      final visible = visibleThreads(
        threads,
        portalClientId: 'c1',
        portalContentIds: {'post-1'},
      );

      expect(visible.map((t) => t.id), ['own', 'post']);
    });
  });

  group('groupCommentsByDay', () {
    test('buckets comments by local calendar day', () {
      final comments = [
        FeedbackComment(id: '1', authorId: 'a', body: 'Hi', createdAt: DateTime(2026, 10, 8, 23)),
        FeedbackComment(id: '2', authorId: 'a', body: 'There', createdAt: DateTime(2026, 10, 9, 1)),
        FeedbackComment(id: '3', authorId: 'b', body: 'Later', createdAt: DateTime(2026, 10, 9, 15)),
      ];
      final groups = groupCommentsByDay(comments);
      expect(groups, hasLength(2));
      expect(groups.first.comments.map((c) => c.id), ['1']);
      expect(groups.last.comments.map((c) => c.id), ['2', '3']);
    });
  });
}
