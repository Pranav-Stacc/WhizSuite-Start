import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import 'entity_routes.dart';

/// Minimum characters before the workspace search endpoint is called.
const searchMinQueryLength = 2;

/// One hit from `GET …/search`, normalised across entity groups.
class SearchHit {
  const SearchHit({
    required this.id,
    required this.kind,
    required this.title,
    this.subtitle,
    this.status,
  });

  final String id;
  final EntityKind kind;
  final String title;
  final String? subtitle;
  final String? status;

  String? get route => entityRoute(_kindKey(kind), id);
}

String _kindKey(EntityKind kind) => switch (kind) {
      EntityKind.client => 'client',
      EntityKind.project => 'project',
      EntityKind.task => 'task',
      EntityKind.lead => 'lead',
      EntityKind.content => 'content',
      EntityKind.invoice => 'invoice',
      EntityKind.approval => 'approval',
    };

/// Grouped search payload returned by the API.
class SearchResults {
  const SearchResults({
    this.clients = const [],
    this.projects = const [],
    this.tasks = const [],
    this.leads = const [],
    this.content = const [],
  });

  factory SearchResults.fromJson(Json json) => SearchResults(
        clients: _hits(json.objects('clients'), EntityKind.client, (item) => item.strOrNull('displayName') ?? item.str('name')),
        projects: _hits(json.objects('projects'), EntityKind.project, (item) => item.str('name')),
        tasks: _hits(json.objects('tasks'), EntityKind.task, (item) => item.str('title')),
        leads: _hits(json.objects('leads'), EntityKind.lead, (item) => item.str('companyName')),
        content: _hits(json.objects('content'), EntityKind.content, (item) => item.str('title')),
      );

  static const empty = SearchResults();

  final List<SearchHit> clients;
  final List<SearchHit> projects;
  final List<SearchHit> tasks;
  final List<SearchHit> leads;
  final List<SearchHit> content;

  bool get isEmpty =>
      clients.isEmpty && projects.isEmpty && tasks.isEmpty && leads.isEmpty && content.isEmpty;

  int get total => clients.length + projects.length + tasks.length + leads.length + content.length;

  /// Non-empty groups in a stable display order.
  List<({EntityKind kind, List<SearchHit> hits})> get groups => [
        for (final entry in [
          (EntityKind.client, clients),
          (EntityKind.project, projects),
          (EntityKind.task, tasks),
          (EntityKind.lead, leads),
          (EntityKind.content, content),
        ])
          if (entry.$2.isNotEmpty) (kind: entry.$1, hits: entry.$2),
      ];
}

List<SearchHit> _hits(List<Json> items, EntityKind kind, String Function(Json) titleOf) => [
      for (final item in items)
        if (item.str('id').isNotEmpty)
          SearchHit(
            id: item.str('id'),
            kind: kind,
            title: titleOf(item),
            subtitle: item.strOrNull('status') ?? item.strOrNull('stageId'),
            status: item.strOrNull('status'),
          ),
    ];
