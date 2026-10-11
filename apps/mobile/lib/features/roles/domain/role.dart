import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import 'permission_module_scopes.dart';

/// Name of the provisioned system role that backs the OWNER membership; never assignable.
/// Mirrors `DEFAULT_MEMBERSHIP_ROLES.OWNER.name` in `packages/contracts`.
const ownerRoleName = 'Owner';

/// A role as referenced from elsewhere (a member's assignments).
class RoleSummary {
  const RoleSummary({
    required this.id,
    required this.name,
    this.isSystem = false,
    this.kind = RoleKinds.access,
    this.defaultScopeTypes = const [ScopeTypes.organization],
  });

  factory RoleSummary.fromJson(Json json) => RoleSummary(
        id: json.str('id'),
        name: json.str('name'),
        isSystem: json.flag('isSystem'),
        kind: json.strOrNull('kind') == RoleKinds.workflow ? RoleKinds.workflow : RoleKinds.access,
        defaultScopeTypes: _scopes(json),
      );

  final String id;
  final String name;
  final bool isSystem;
  final String kind;
  final List<String> defaultScopeTypes;

  /// The owner role is held by the organisation's owner only and cannot be granted.
  bool get isOwner => isSystem && name == ownerRoleName;
}

List<String> _scopes(Json json) {
  final scopes = json.strings('defaultScopeTypes');
  return scopes.isEmpty ? const [ScopeTypes.organization] : scopes;
}

/// An organisation role: a named set of permission keys members can be assigned.
class Role {
  const Role({
    required this.id,
    required this.name,
    required this.permissionKeys,
    this.description = '',
    this.isSystem = false,
    this.kind = RoleKinds.access,
    this.defaultScopeTypes = const [ScopeTypes.organization],
    this.moduleScopes = const {},
    this.moduleScopeResources = const {},
    this.memberCount = 0,
  });

  /// Reads `GET roles`: permissions arrive as `[{ permission: { key } }]`, members as `assignments`.
  factory Role.fromJson(Json json) => Role(
        id: json.str('id'),
        name: json.str('name'),
        description: json.str('description'),
        isSystem: json.flag('isSystem'),
        kind: json.strOrNull('kind') == RoleKinds.workflow ? RoleKinds.workflow : RoleKinds.access,
        defaultScopeTypes: _scopes(json),
        permissionKeys: {
          for (final row in json.objects('permissions')) ?(row.object('permission') ?? row).strOrNull('key'),
        },
        moduleScopes: _moduleScopesFromPermissions(json),
        moduleScopeResources: _moduleScopeResourcesFromPermissions(json),
        memberCount: json.integerOrNull('memberCount') ?? json.objects('assignments').length,
      );

  final String id;
  final String name;
  final String description;
  final bool isSystem;
  final String kind;
  final List<String> defaultScopeTypes;
  final Set<String> permissionKeys;
  /// Union of per-permission scope types, grouped by module prefix.
  final Map<String, Set<String>> moduleScopes;
  /// Per-module resource ids keyed by scope type (CLIENT, PROJECT, …).
  final Map<String, Map<String, Set<String>>> moduleScopeResources;
  final int memberCount;

  RoleSummary get summary => RoleSummary(
        id: id,
        name: name,
        isSystem: isSystem,
        kind: kind,
        defaultScopeTypes: defaultScopeTypes,
      );

  bool get isOwner => summary.isOwner;

  bool get isWorkflow => kind == RoleKinds.workflow;

  /// Only the Owner system role is fixed; other roles (including system templates) may be edited.
  bool get isEditable => !isOwner;
}

Map<String, Set<String>> _moduleScopesFromPermissions(Json json) {
  final map = <String, Set<String>>{};
  for (final row in json.objects('permissions')) {
    final perm = row.object('permission') ?? row;
    final key = perm.strOrNull('key');
    if (key == null) continue;
    final module = moduleKeyForPermission(key);
    final conditions = row.object('conditions');
    final types = conditions?.strings('scopeTypes') ?? const [];
    if (types.isEmpty) continue;
    map.putIfAbsent(module, () => {}).addAll(types);
  }
  return map;
}

Map<String, Map<String, Set<String>>> _moduleScopeResourcesFromPermissions(Json json) {
  final map = <String, Map<String, Set<String>>>{};
  for (final row in json.objects('permissions')) {
    final perm = row.object('permission') ?? row;
    final key = perm.strOrNull('key');
    if (key == null) continue;
    final module = moduleKeyForPermission(key);
    final conditions = row.object('conditions');
    final resources = conditions?.object('resources');
    if (resources == null) continue;
    for (final scopeType in resources.keys) {
      final raw = resources[scopeType];
      final ids = raw is List ? raw.whereType<String>().where((id) => id.isNotEmpty).toList() : const <String>[];
      if (ids.isEmpty) continue;
      map.putIfAbsent(module, () => {})[scopeType] = ids.toSet();
    }
  }
  return map;
}

/// Fields the role editor submits.
class RoleInput {
  const RoleInput({
    required this.name,
    required this.description,
    required this.permissionKeys,
    this.kind = RoleKinds.access,
    this.defaultScopeTypes = const [ScopeTypes.organization],
    this.permissionScopes = const [],
  });

  final String name;
  final String description;
  final Set<String> permissionKeys;
  final String kind;
  final List<String> defaultScopeTypes;
  final List<Map<String, Object>> permissionScopes;

  Json toJson() => {
        'name': name,
        'description': description,
        'kind': kind,
        'permissionKeys': (permissionKeys.toList()..sort()),
        'defaultScopeTypes': defaultScopeTypes,
        if (permissionScopes.isNotEmpty) 'permissionScopes': permissionScopes,
      };
}
