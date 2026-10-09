import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../directory/application/directory_providers.dart';
import '../data/clients_repository.dart';
import '../domain/client.dart';

final clientsProvider = FutureProvider.autoDispose<List<Client>>(
  (ref) => ref.watch(clientsRepositoryProvider).list(),
);

final clientProvider = FutureProvider.autoDispose.family<Client, String>(
  (ref, id) => ref.watch(clientsRepositoryProvider).get(id),
);

/// Client mutations; each refreshes every view that shows clients.
class ClientsActions {
  ClientsActions(this._ref);

  final Ref _ref;

  ClientsRepository get _repo => _ref.read(clientsRepositoryProvider);

  Future<Client> create(ClientInput input) async {
    final workspaceId = await _ref.read(defaultWorkspaceIdProvider.future);
    if (workspaceId == null) throw const ApiException(kind: ApiFailureKind.forbidden);
    final client = await _repo.create(input, workspaceId: workspaceId);
    _invalidate();
    return client;
  }

  Future<void> update(String id, ClientInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _invalidate(id);
  }

  Future<void> updateBrandKit(String id, BrandKit kit) async {
    await _repo.updateBrandKit(id, kit);
    _invalidate(id);
  }

  void _invalidate([String? id]) {
    _ref
      ..invalidate(clientsProvider)
      ..invalidate(clientDirectoryProvider);
    if (id != null) _ref.invalidate(clientProvider(id));
  }
}

final clientsActionsProvider = Provider<ClientsActions>(ClientsActions.new);
