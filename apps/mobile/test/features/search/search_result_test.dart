import 'package:agency_os/features/search/domain/entity_routes.dart';
import 'package:agency_os/features/search/domain/search_result.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('entityKindOf / entityRoute', () {
    test('normalises API aliases to feature detail routes', () {
      expect(entityKindOf('ContentItem'), EntityKind.content);
      expect(entityKindOf('clients'), EntityKind.client);
      expect(entityRoute('task', 't1'), '/tasks/t1');
      expect(entityRoute('approvalRequest', 'a1'), '/approvals/a1');
      expect(entityRoute('unknown', 'x'), isNull);
      expect(entityRoute('client', ''), isNull);
    });
  });

  group('SearchResults.fromJson', () {
    test('maps each group and ignores empty ids', () {
      final results = SearchResults.fromJson({
        'clients': [
          {'id': 'c1', 'displayName': 'Acme', 'status': 'ACTIVE'},
          {'id': '', 'displayName': 'Skip'},
        ],
        'projects': [
          {'id': 'p1', 'name': 'Launch', 'status': 'ACTIVE'},
        ],
        'tasks': [
          {'id': 't1', 'title': 'Write brief', 'status': 'TODO'},
        ],
        'leads': [
          {'id': 'l1', 'companyName': 'Beta Co', 'stageId': 's1'},
        ],
        'content': [
          {'id': 'post1', 'title': 'October reel', 'status': 'IN_REVIEW'},
        ],
      });

      expect(results.clients.single.title, 'Acme');
      expect(results.clients.single.route, '/clients/c1');
      expect(results.projects.single.title, 'Launch');
      expect(results.tasks.single.title, 'Write brief');
      expect(results.leads.single.title, 'Beta Co');
      expect(results.content.single.route, '/content/post1');
      expect(results.groups.map((g) => g.kind), [
        EntityKind.client,
        EntityKind.project,
        EntityKind.task,
        EntityKind.lead,
        EntityKind.content,
      ]);
    });

    test('empty query payload stays empty', () {
      expect(SearchResults.fromJson({}).isEmpty, isTrue);
      expect(SearchResults.empty.groups, isEmpty);
    });
  });
}
