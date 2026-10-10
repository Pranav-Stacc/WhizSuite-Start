import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../roles/domain/role.dart';

class PermissionOverride {
  const PermissionOverride({required this.key, required this.effect});

  factory PermissionOverride.fromJson(Json json) => PermissionOverride(
        key: json.str('key'),
        effect: json.str('effect'),
      );

  final String key;
  final String effect;

  Map<String, String> toJson() => {'key': key, 'effect': effect};
}

class MemberAccess {
  const MemberAccess({
    required this.roles,
    required this.overrides,
    required this.effectivePermissions,
  });

  factory MemberAccess.fromJson(Json json) => MemberAccess(
        roles: json.objects('roles').map(RoleSummary.fromJson).toList(),
        overrides: json.objects('overrides').map(PermissionOverride.fromJson).toList(),
        effectivePermissions: json.strings('effectivePermissions').toSet(),
      );

  final List<RoleSummary> roles;
  final List<PermissionOverride> overrides;
  final Set<String> effectivePermissions;
}

/// (role permissions ∪ ALLOW overrides) − DENY overrides.
Set<String> computeEffectivePermissions({
  required Set<String> rolePermissionKeys,
  required Map<String, String> overrides,
}) {
  final granted = Set<String>.from(rolePermissionKeys);
  for (final entry in overrides.entries) {
    if (entry.value == PermissionEffects.allow) granted.add(entry.key);
  }
  for (final entry in overrides.entries) {
    if (entry.value == PermissionEffects.deny) granted.remove(entry.key);
  }
  return granted;
}
