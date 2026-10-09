import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/integrations_repository.dart';
import '../domain/integration_connection.dart';

final integrationConnectionsProvider = FutureProvider.autoDispose<List<IntegrationConnection>>(
  (ref) => ref.watch(integrationsRepositoryProvider).list(),
);

/// Connection mutations; each refreshes the connections list.
class IntegrationsActions {
  IntegrationsActions(this._ref);

  final Ref _ref;

  IntegrationsRepository get _repo => _ref.read(integrationsRepositoryProvider);

  Future<void> connect(ConnectionInput input) async {
    await _repo.create(input);
    _ref.invalidate(integrationConnectionsProvider);
  }

  Future<void> update(String id, ConnectionInput input) async {
    await _repo.update(id, input);
    _ref.invalidate(integrationConnectionsProvider);
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _ref.invalidate(integrationConnectionsProvider);
  }
}

final integrationsActionsProvider = Provider<IntegrationsActions>(IntegrationsActions.new);
