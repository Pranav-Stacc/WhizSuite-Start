import '../../../core/contracts/contracts.g.dart';

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

/// Builds API `permissionScopes` rows for selected keys and per-module scope choices.
List<Map<String, Object>> buildPermissionScopes(
  Set<String> permissionKeys,
  Map<String, Set<String>> moduleScopes,
) {
  final rows = <Map<String, Object>>[];
  for (final key in permissionKeys) {
    final module = moduleKeyForPermission(key);
    final allowed = allowedScopesForPermission(key).toSet();
    final chosen = (moduleScopes[module] ?? {ScopeTypes.organization}).where(allowed.contains).toList();
    rows.add({
      'key': key,
      'scopeTypes': chosen.isNotEmpty ? chosen : [ScopeTypes.organization],
    });
  }
  return rows;
}
