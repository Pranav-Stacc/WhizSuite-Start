import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/project.dart';

class ProjectsRepository {
  ProjectsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('projects');

  Future<List<Project>> list() async => jsonList(await _api.get<Object?>(_base)).map(Project.fromJson).toList();

  Future<Project> get(String id) async => Project.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Project> create(ProjectInput input) async =>
      Project.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<Project> update(String id, ProjectInput input) async =>
      Project.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: input.toJson())));

  Future<void> setStatus(String id, String status) => _api.patch<Object?>('$_base/$id', body: {'status': status});

  /// Minutes logged against the project (`GET time/entries`, needs `time.track`).
  Future<int> loggedMinutes(String projectId) async {
    final entries = jsonList(await _api.get<Object?>(_api.org('time/entries')));
    return entries.where((e) => e.strOrNull('projectId') == projectId).fold<int>(0, (sum, e) => sum + e.integer('minutes'));
  }

  /// The client's content (`GET content?clientId=`, needs `content.view`).
  Future<List<ProjectContentItem>> clientContent(String clientId) async =>
      jsonList(await _api.get<Object?>(_api.org('content'), query: {'clientId': clientId}))
          .map(ProjectContentItem.fromJson)
          .toList();
}

final projectsRepositoryProvider = Provider<ProjectsRepository>(
  (ref) => ProjectsRepository(ref.watch(apiClientProvider)),
);
