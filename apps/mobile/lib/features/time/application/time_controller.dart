import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../data/time_repository.dart';
import '../domain/time_entry.dart';

final timeEntriesProvider = FutureProvider.autoDispose<List<TimeEntry>>(
  (ref) => ref.watch(timeRepositoryProvider).entries(),
);

final runningTimerProvider = FutureProvider.autoDispose<RunningTimer?>(
  (ref) => ref.watch(timeRepositoryProvider).runningTimer(),
);

/// Tasks for the timer and log form; empty when the member may not list tasks.
final timeTasksProvider = FutureProvider.autoDispose<List<TaskOption>>((ref) async {
  final allowed = ref.watch(accessPolicyProvider.select((policy) => policy.can(Permissions.tasksView)));
  if (!allowed) return const [];
  return ref.watch(timeRepositoryProvider).tasks();
});

/// Time mutations; each refreshes the entries and timer views.
class TimeActions {
  TimeActions(this._ref);

  final Ref _ref;

  TimeRepository get _repo => _ref.read(timeRepositoryProvider);

  Future<void> log(TimeEntryInput input) async {
    await _repo.log(input);
    _ref.invalidate(timeEntriesProvider);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(timeEntriesProvider);
  }

  Future<void> startTimer(String taskId) async {
    await _repo.startTimer(taskId);
    _ref.invalidate(runningTimerProvider);
  }

  Future<void> stopTimer() async {
    await _repo.stopTimer();
    _ref
      ..invalidate(runningTimerProvider)
      ..invalidate(timeEntriesProvider);
  }
}

final timeActionsProvider = Provider<TimeActions>(TimeActions.new);
