import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../access/application/access_controller.dart';
import '../data/roles_repository.dart';
import '../domain/permission_catalog.dart';
import '../domain/role.dart';

/// Every role in the organisation, system roles first, then alphabetical.
final rolesProvider = FutureProvider.autoDispose<List<Role>>((ref) async {
  final roles = await ref.watch(rolesRepositoryProvider).list();
  return roles..sort((a, b) => a.isSystem == b.isSystem ? a.name.compareTo(b.name) : (a.isSystem ? -1 : 1));
});

/// One role, resolved from the list (the API has no single-role endpoint).
final roleProvider = FutureProvider.autoDispose.family<Role, String>((ref, id) async {
  final roles = await ref.watch(rolesProvider.future);
  for (final role in roles) {
    if (role.id == id) return role;
  }
  throw const ApiException(kind: ApiFailureKind.notFound);
});

/// Roles a member may be given: everything except the owner role.
final assignableRolesProvider = FutureProvider.autoDispose<List<Role>>(
  (ref) async => (await ref.watch(rolesProvider.future)).where((role) => !role.isOwner).toList(),
);

/// The platform permission catalog grouped by domain.
final permissionGroupsProvider = FutureProvider.autoDispose<List<PermissionGroup>>(
  (ref) async => groupPermissions(await ref.watch(rolesRepositoryProvider).permissions()),
);

/// Role mutations. Permission edits can change what the signed-in member may do,
/// so access is re-fetched after each one and navigation re-gates immediately.
class RolesActions {
  RolesActions(this._ref);

  final Ref _ref;

  RolesRepository get _repo => _ref.read(rolesRepositoryProvider);

  Future<Role> create(RoleInput input) async {
    final role = await _repo.create(input);
    _ref.invalidate(rolesProvider);
    return role;
  }

  Future<void> update(String id, RoleInput input) async {
    await _repo.update(id, input);
    await _afterChange();
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    await _afterChange();
  }

  Future<void> _afterChange() async {
    _ref.invalidate(rolesProvider);
    await _ref.read(accessProvider.notifier).refresh();
  }
}

final rolesActionsProvider = Provider<RolesActions>(RolesActions.new);
