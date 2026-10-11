import '../../../core/contracts/contracts.g.dart';
import '../../roles/domain/role.dart';
import 'role_assignment_scope.dart';

/// Scope types offered by the currently selected assignable roles.
List<String> offeredScopesForRoles(List<Role> roles, Set<String> selectedRoleIds) {
  final union = <String>{};
  for (final role in roles) {
    if (!selectedRoleIds.contains(role.id)) continue;
    union.addAll(
      role.defaultScopeTypes.isEmpty ? [AssignableScopeTypes.organization] : role.defaultScopeTypes,
    );
  }
  return AssignableScopeTypes.values.where(union.contains).toList();
}

/// Keeps only scopes still valid for the role selection; falls back to all offered scopes.
Set<String> resolveActiveScopes(Set<String> active, List<String> offered) {
  final kept = active.where(offered.contains).toSet();
  if (kept.isNotEmpty) return kept;
  if (offered.isEmpty) return {AssignableScopeTypes.organization};
  return offered.toSet();
}

/// Whether a scoped type applies to the whole org or chosen records.
enum ScopeResourceTargeting { allInOrg, specific }

List<RoleAssignmentScope> buildAssignmentScopes(
  Set<String> activeScopes,
  Map<String, Set<String>> resourceIds, {
  Map<String, ScopeResourceTargeting> targeting = const {},
}) {
  final scopes = <RoleAssignmentScope>[];
  for (final scopeType in activeScopes) {
    if (_resourceScopes.contains(scopeType)) {
      final mode = targeting[scopeType] ?? ScopeResourceTargeting.allInOrg;
      if (mode == ScopeResourceTargeting.allInOrg) {
        scopes.add(RoleAssignmentScope(scopeType: scopeType));
      } else {
        for (final id in resourceIds[scopeType] ?? const {}) {
          scopes.add(RoleAssignmentScope(scopeType: scopeType, resourceId: id));
        }
      }
    } else {
      scopes.add(RoleAssignmentScope(scopeType: scopeType));
    }
  }
  return scopes;
}

const _resourceScopes = {
  AssignableScopeTypes.department,
  AssignableScopeTypes.team,
  AssignableScopeTypes.client,
  AssignableScopeTypes.project,
};

bool scopeNeedsResource(String scopeType) => _resourceScopes.contains(scopeType);
