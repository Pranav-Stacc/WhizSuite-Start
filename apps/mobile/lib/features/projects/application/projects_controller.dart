import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../tasks/application/tasks_controller.dart';
import '../data/projects_repository.dart';
import '../domain/project.dart';

/// Recent content shown on a project page.
const int projectContentPreviewCount = 5;

final projectsProvider = FutureProvider.autoDispose<List<Project>>(
  (ref) => ref.watch(projectsRepositoryProvider).list(),
);

final projectProvider = FutureProvider.autoDispose.family<Project, String>(
  (ref, id) => ref.watch(projectsRepositoryProvider).get(id),
);

bool _can(Ref ref, String permission) => ref.watch(accessPolicyProvider.select((policy) => policy.can(permission)));

/// Task progress per project for the list; null when the member cannot see tasks.
final projectProgressProvider = FutureProvider.autoDispose<Map<String, ProjectProgress>?>((ref) async {
  if (!_can(ref, Permissions.tasksView)) return null;
  return ProjectProgress.byProject(await ref.watch(tasksProvider.future));
});

/// Minutes logged on a project; null when the member cannot read time entries.
final projectLoggedMinutesProvider = FutureProvider.autoDispose.family<int?, String>((ref, projectId) async {
  if (!_can(ref, Permissions.timeTrack)) return null;
  return ref.watch(projectsRepositoryProvider).loggedMinutes(projectId);
});

/// Latest content of the project's client; null when the member cannot see content.
final projectClientContentProvider = FutureProvider.autoDispose.family<List<ProjectContentItem>?, String>((ref, clientId) async {
  if (!_can(ref, Permissions.contentView)) return null;
  final items = await ref.watch(projectsRepositoryProvider).clientContent(clientId);
  return items.take(projectContentPreviewCount).toList();
});

/// Project mutations; each refreshes every view that shows projects, including name pickers.
class ProjectsActions {
  ProjectsActions(this._ref);

  final Ref _ref;

  ProjectsRepository get _repo => _ref.read(projectsRepositoryProvider);

  Future<Project> create(ProjectInput input) async {
    final project = await _repo.create(input);
    _invalidate();
    return project;
  }

  Future<void> update(String id, ProjectInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _invalidate(id);
  }

  void _invalidate([String? id]) {
    _ref
      ..invalidate(projectsProvider)
      ..invalidate(projectDirectoryProvider);
    if (id != null) _ref.invalidate(projectProvider(id));
  }
}

final projectsActionsProvider = Provider<ProjectsActions>(ProjectsActions.new);
