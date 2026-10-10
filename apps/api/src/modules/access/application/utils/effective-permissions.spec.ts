import {
  ALL_PERMISSIONS,
  PermissionEffects,
  Permissions,
} from '@agency-os/contracts';
import { applyPermissionOverrides } from './effective-permissions';

describe('applyPermissionOverrides', () => {
  it('returns every permission for owners and ignores overrides', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.ORG_VIEW],
      overrides: [
        { key: Permissions.ORG_VIEW, effect: PermissionEffects.DENY },
      ],
      isOwner: true,
    });
    expect(result).toEqual(
      [...ALL_PERMISSIONS].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('unions role permissions with ALLOW overrides', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.ORG_VIEW],
      overrides: [
        { key: Permissions.MEMBERS_VIEW, effect: PermissionEffects.ALLOW },
      ],
      isOwner: false,
    });
    expect(result).toEqual(
      [Permissions.MEMBERS_VIEW, Permissions.ORG_VIEW].sort((a, b) =>
        a.localeCompare(b),
      ),
    );
  });

  it('removes DENY overrides even when a role grants the permission', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.ORG_VIEW, Permissions.MEMBERS_VIEW],
      overrides: [
        { key: Permissions.MEMBERS_VIEW, effect: PermissionEffects.DENY },
      ],
      isOwner: false,
    });
    expect(result).toEqual([Permissions.ORG_VIEW]);
  });

  it('lets DENY beat a matching ALLOW override', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [],
      overrides: [
        { key: Permissions.ORG_VIEW, effect: PermissionEffects.ALLOW },
        { key: Permissions.ORG_VIEW, effect: PermissionEffects.DENY },
      ],
      isOwner: false,
    });
    expect(result).toEqual([]);
  });
});
