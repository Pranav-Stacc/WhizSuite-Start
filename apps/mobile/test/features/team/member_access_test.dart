import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/team/domain/member_access.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('computeEffectivePermissions unions roles and ALLOW overrides', () {
    final effective = computeEffectivePermissions(
      rolePermissionKeys: {Permissions.orgView},
      overrides: {Permissions.membersView: PermissionEffects.allow},
    );
    expect(effective, {Permissions.membersView, Permissions.orgView});
  });

  test('computeEffectivePermissions removes DENY overrides', () {
    final effective = computeEffectivePermissions(
      rolePermissionKeys: {Permissions.orgView, Permissions.membersView},
      overrides: {Permissions.membersView: PermissionEffects.deny},
    );
    expect(effective, {Permissions.orgView});
  });
}
