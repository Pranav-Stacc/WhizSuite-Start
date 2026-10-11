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

  it('adds optional companion reads for content.edit with the same grant', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.CONTENT_EDIT],
      overrides: [],
      isOwner: false,
    });
    expect(result).toEqual(
      expect.arrayContaining([
        Permissions.CONTENT_EDIT,
        Permissions.CONTENT_VIEW,
        Permissions.CLIENTS_VIEW,
        Permissions.FILES_VIEW,
      ]),
    );
  });

  it('adds optional companion reads for calendar.view with the same grant', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.CALENDAR_VIEW],
      overrides: [],
      isOwner: false,
    });
    expect(result).toEqual(
      expect.arrayContaining([
        Permissions.CALENDAR_VIEW,
        Permissions.CLIENTS_VIEW,
        Permissions.CONTENT_VIEW,
      ]),
    );
  });

  it('lets DENY remove a companion that would otherwise be implied', () => {
    const result = applyPermissionOverrides({
      rolePermissions: [Permissions.CONTENT_EDIT],
      overrides: [
        { key: Permissions.FILES_VIEW, effect: PermissionEffects.DENY },
      ],
      isOwner: false,
    });
    expect(result).toContain(Permissions.CONTENT_EDIT);
    expect(result).not.toContain(Permissions.FILES_VIEW);
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
