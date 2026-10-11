import '../../../core/contracts/contracts.g.dart';
import '../../team/domain/scope_assignment.dart';

/// Permission key prefix (`content.create` → `content`).
String moduleKeyForPermission(String key) {
  final dot = key.indexOf('.');
  return dot == -1 ? key : key.substring(0, dot);
}

/// Scope types allowed for a permission module (from contracts).
/// Human-readable scope label for chips and forms.
String scopeTypeLabel(String scopeType) {
  switch (scopeType) {
    case ScopeTypes.organization:
      return 'Organization';
    case ScopeTypes.workspace:
      return 'Workspace';
    case ScopeTypes.department:
      return 'Department';
    case ScopeTypes.team:
      return 'Team';
    case ScopeTypes.client:
      return 'Client';
    case ScopeTypes.project:
      return 'Project';
    case ScopeTypes.task:
      return 'Task';
    case ScopeTypes.content:
      return 'Content';
    case ScopeTypes.self:
      return 'Self';
    default:
      return scopeType.replaceAll('_', ' ');
  }
}

List<String> allowedScopesForPermission(String permissionKey) {
  final module = moduleKeyForPermission(permissionKey);
  final scopes = permissionModuleScopes[module];
  if (scopes == null || scopes.isEmpty) {
    return const [ScopeTypes.organization];
  }
  return scopes;
}

/// Scope options for a permission group (uses the first permission in the group).
List<String> allowedScopesForGroup(String groupKey, Iterable<String> permissionKeys) {
  final first = permissionKeys.isNotEmpty ? permissionKeys.first : '$groupKey.view';
  return allowedScopesForPermission(first);
}

/// Builds API `permissionScopes` rows for selected keys and per-module scope choices.
List<Map<String, Object>> buildPermissionScopes(
  Set<String> permissionKeys,
  Map<String, Set<String>> moduleScopes, {
  Map<String, Map<String, Set<String>>> moduleResources = const {},
  Map<String, Map<String, ScopeResourceTargeting>> moduleTargeting = const {},
}) {
  final rows = <Map<String, Object>>[];
  for (final key in permissionKeys) {
    final module = moduleKeyForPermission(key);
    final allowed = allowedScopesForPermission(key).toSet();
    final chosen = (moduleScopes[module] ?? {ScopeTypes.organization}).where(allowed.contains).toList();
    final scopeTypes = chosen.isNotEmpty ? chosen : [ScopeTypes.organization];
    final scopeResources = <Map<String, Object>>[];
    final resources = moduleResources[module] ?? const {};
    final targeting = moduleTargeting[module] ?? const {};
    for (final scopeType in scopeTypes) {
      if (!_resourceScopeTypes.contains(scopeType)) continue;
      final mode = targeting[scopeType] ?? ScopeResourceTargeting.allInOrg;
      if (mode == ScopeResourceTargeting.allInOrg) continue;
      final ids = resources[scopeType] ?? const {};
      if (ids.isNotEmpty) {
        scopeResources.add({'scopeType': scopeType, 'resourceIds': ids.toList()});
      }
    }
    rows.add({
      'key': key,
      'scopeTypes': scopeTypes,
      if (scopeResources.isNotEmpty) 'scopeResources': scopeResources,
    });
  }
  return rows;
}

const _resourceScopeTypes = {
  ScopeTypes.department,
  ScopeTypes.team,
  ScopeTypes.client,
  ScopeTypes.project,
};
