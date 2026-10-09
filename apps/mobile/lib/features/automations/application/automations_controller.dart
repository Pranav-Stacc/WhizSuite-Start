import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/automations_repository.dart';
import '../domain/automation.dart';

final automationsProvider = FutureProvider.autoDispose<List<Automation>>(
  (ref) => ref.watch(automationsRepositoryProvider).list(),
);

final automationProvider = FutureProvider.autoDispose.family<Automation, String>(
  (ref, id) => ref.watch(automationsRepositoryProvider).get(id),
);

final automationRunsProvider = FutureProvider.autoDispose<List<AutomationRun>>(
  (ref) => ref.watch(automationsRepositoryProvider).runs(),
);

/// Automation mutations; each refreshes every view that shows automations or their runs.
class AutomationsActions {
  AutomationsActions(this._ref);

  final Ref _ref;

  AutomationsRepository get _repo => _ref.read(automationsRepositoryProvider);

  Future<Automation> create(AutomationInput input) async {
    final automation = await _repo.create(input);
    _invalidate();
    return automation;
  }

  Future<void> update(String id, AutomationInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setEnabled(String id, {required bool enabled}) async {
    await _repo.setEnabled(id, enabled: enabled);
    _invalidate(id);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(automationsProvider);
  }

  Future<int> publish(String id) async {
    final version = await _repo.publish(id);
    _invalidate(id);
    return version;
  }

  Future<void> run(String id, {String? detail}) async {
    await _repo.run(id, detail: detail);
    _invalidate(id);
    _ref.invalidate(automationRunsProvider);
  }

  void _invalidate([String? id]) {
    _ref.invalidate(automationsProvider);
    if (id != null) _ref.invalidate(automationProvider(id));
  }
}

final automationsActionsProvider = Provider<AutomationsActions>(AutomationsActions.new);
