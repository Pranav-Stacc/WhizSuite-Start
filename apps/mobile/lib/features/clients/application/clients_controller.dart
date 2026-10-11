import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../directory/application/directory_providers.dart';
import '../../workspaces/application/workspace_providers.dart';
import '../../workspaces/tenancy_ui.dart';
import '../data/client_contacts_repository.dart';
import '../data/clients_repository.dart';
import '../domain/client.dart';

final clientsProvider = FutureProvider.autoDispose<List<Client>>((ref) async {
  if (!tenancyWorkspaceUiEnabled) {
    return ref.watch(clientsRepositoryProvider).list();
  }
  final workspaceId = await ref.watch(activeWorkspaceIdProvider.future);
  return ref.watch(clientsRepositoryProvider).list(workspaceId: workspaceId);
});

final clientProvider = FutureProvider.autoDispose.family<Client, String>(
  (ref, id) => ref.watch(clientsRepositoryProvider).get(id),
);

/// Client mutations; each refreshes every view that shows clients.
class ClientsActions {
  ClientsActions(this._ref);

  final Ref _ref;

  ClientsRepository get _repo => _ref.read(clientsRepositoryProvider);

  Future<Client> create(ClientInput input) async {
    final workspaceId = await _ref.read(activeWorkspaceIdProvider.future);
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

  Future<void> addContact({
    required String clientId,
    required String firstName,
    String? lastName,
    String? email,
    String? phone,
    String? role,
  }) async {
    await _ref.read(clientContactsRepositoryProvider).create(
          clientId: clientId,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          role: role,
        );
    _invalidate(clientId);
  }

  Future<void> removeContact(String clientId, String contactId) async {
    await _ref.read(clientContactsRepositoryProvider).delete(contactId);
    _invalidate(clientId);
  }

  void _invalidate([String? id]) {
    _ref
      ..invalidate(clientsProvider)
      ..invalidate(clientDirectoryProvider);
    if (id != null) _ref.invalidate(clientProvider(id));
  }
}

final clientsActionsProvider = Provider<ClientsActions>(ClientsActions.new);
