import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/workflows_repository.dart';
import '../domain/workflow.dart';

final workflowsProvider = FutureProvider.autoDispose<List<Workflow>>(
  (ref) => ref.watch(workflowsRepositoryProvider).list(),
);

final workflowProvider = FutureProvider.autoDispose.family<Workflow, String>(
  (ref, id) => ref.watch(workflowsRepositoryProvider).get(id),
);

final workflowVersionProvider = FutureProvider.autoDispose.family<WorkflowVersion, String>(
  (ref, versionId) => ref.watch(workflowsRepositoryProvider).version(versionId),
);

/// Workflow mutations; each refreshes every view that shows workflows.
class WorkflowsActions {
  WorkflowsActions(this._ref);

  final Ref _ref;

  WorkflowsRepository get _repo => _ref.read(workflowsRepositoryProvider);

  Future<Workflow> create(WorkflowInput input) async {
    final workflow = await _repo.create(input);
    _ref.invalidate(workflowsProvider);
    return workflow;
  }

  Future<void> update(String id, WorkflowInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setActive(String id, {required bool active}) async {
    await _repo.setActive(id, active: active);
    _invalidate(id);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(workflowsProvider);
  }

  Future<void> publishVersion(String workflowId, String versionId) async {
    await _repo.publishVersion(versionId);
    _invalidate(workflowId);
    _ref.invalidate(workflowVersionProvider(versionId));
  }

  Future<bool> canTransition(String versionId, {required String fromKey, required String toKey}) =>
      _repo.canTransition(versionId, fromKey: fromKey, toKey: toKey);

  void _invalidate(String id) {
    _ref
      ..invalidate(workflowsProvider)
      ..invalidate(workflowProvider(id));
  }
}

final workflowsActionsProvider = Provider<WorkflowsActions>(WorkflowsActions.new);
