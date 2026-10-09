import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/leads_repository.dart';
import '../domain/lead.dart';

/// The pipeline board. Stage moves are applied optimistically and rolled back on failure.
class LeadsController extends AsyncNotifier<List<Lead>> {
  @override
  Future<List<Lead>> build() => ref.watch(leadsRepositoryProvider).list();

  Future<void> moveStage(String id, String stage) async {
    final previous = state.value;
    if (previous != null) state = AsyncData(_replace(previous, id, (lead) => lead.withStage(stage)));
    try {
      final saved = await ref.read(leadsRepositoryProvider).setStage(id, stage);
      final current = state.value;
      if (ref.mounted && current != null) state = AsyncData(_replace(current, id, (_) => saved));
    } catch (_) {
      if (ref.mounted && previous != null) state = AsyncData(previous);
      rethrow;
    }
  }

  static List<Lead> _replace(List<Lead> leads, String id, Lead Function(Lead lead) change) =>
      [for (final lead in leads) lead.id == id ? change(lead) : lead];
}

final leadsProvider = AsyncNotifierProvider.autoDispose<LeadsController, List<Lead>>(LeadsController.new);

final leadProvider = FutureProvider.autoDispose.family<Lead, String>(
  (ref, id) => ref.watch(leadsRepositoryProvider).get(id),
);

/// Lead mutations; each refreshes every view that shows the lead.
class LeadsActions {
  LeadsActions(this._ref);

  final Ref _ref;

  LeadsRepository get _repo => _ref.read(leadsRepositoryProvider);

  Future<Lead> create(LeadInput input) async {
    final lead = await _repo.create(input);
    _ref.invalidate(leadsProvider);
    return lead;
  }

  Future<void> update(String id, LeadInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> moveStage(String id, String stage) async {
    await _ref.read(leadsProvider.notifier).moveStage(id, stage);
    _ref.invalidate(leadProvider(id));
  }

  Future<void> setNextStep(String id, String? step, DateTime? at) async {
    await _repo.setNextStep(id, step, at);
    _invalidate(id);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(leadsProvider);
  }

  void _invalidate(String id) {
    _ref
      ..invalidate(leadsProvider)
      ..invalidate(leadProvider(id));
  }
}

final leadsActionsProvider = Provider<LeadsActions>(LeadsActions.new);
