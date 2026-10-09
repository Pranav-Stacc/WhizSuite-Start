import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/tasks_repository.dart';
import '../domain/task.dart';

final tasksProvider = FutureProvider.autoDispose<List<Task>>(
  (ref) => ref.watch(tasksRepositoryProvider).list(),
);

final taskProvider = FutureProvider.autoDispose.family<Task, String>(
  (ref, id) => ref.watch(tasksRepositoryProvider).get(id),
);

/// Tasks of one project; public so the projects feature can show progress and the task list.
final tasksForProjectProvider = FutureProvider.autoDispose.family<List<Task>, String>(
  (ref, projectId) => ref.watch(tasksRepositoryProvider).list(projectId: projectId),
);

/// Task mutations; each refreshes every view that shows tasks (board, detail, project pages, calendar).
class TasksActions {
  TasksActions(this._ref);

  final Ref _ref;

  TasksRepository get _repo => _ref.read(tasksRepositoryProvider);

  Future<Task> create(TaskInput input) async {
    final task = await _repo.create(input);
    _invalidate();
    return task;
  }

  Future<void> update(String id, TaskPatch patch) async {
    await _repo.update(id, patch);
    _invalidate(id);
  }

  Future<void> transition(String id, String toStatus) async {
    await _repo.transition(id, toStatus);
    _invalidate(id);
  }

  /// The detail screen leaves before this resolves, so the deleted task is not re-fetched.
  Future<void> delete(String id) async {
    await _repo.delete(id);
    _invalidate();
  }

  void _invalidate([String? id]) {
    _ref
      ..invalidate(tasksProvider)
      ..invalidate(tasksForProjectProvider);
    if (id != null) _ref.invalidate(taskProvider(id));
  }
}

final tasksActionsProvider = Provider<TasksActions>(TasksActions.new);
