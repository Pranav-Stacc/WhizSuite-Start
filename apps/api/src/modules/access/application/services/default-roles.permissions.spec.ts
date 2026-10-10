import { DEFAULT_MEMBERSHIP_ROLES, Permissions } from '@agency-os/contracts';

describe('DEFAULT_MEMBERSHIP_ROLES permission matrix', () => {
  const client = new Set(DEFAULT_MEMBERSHIP_ROLES.CLIENT.permissions);
  const member = new Set(DEFAULT_MEMBERSHIP_ROLES.MEMBER.permissions);
  const admin = new Set(DEFAULT_MEMBERSHIP_ROLES.ADMIN.permissions);
  const owner = new Set(DEFAULT_MEMBERSHIP_ROLES.OWNER.permissions);

  it('keeps portal clients on content/approvals — not staff calendar', () => {
    expect(client.has(Permissions.CONTENT_VIEW)).toBe(true);
    expect(client.has(Permissions.APPROVALS_VIEW)).toBe(true);
    expect(client.has(Permissions.APPROVALS_APPROVE)).toBe(true);
    expect(client.has(Permissions.CHAT_VIEW)).toBe(true);
    expect(client.has(Permissions.CALENDAR_VIEW)).toBe(false);
    expect(client.has(Permissions.CALENDAR_CREATE)).toBe(false);
    expect(client.has(Permissions.CALENDAR_SYNC)).toBe(false);
    expect(client.has(Permissions.PROJECTS_CREATE)).toBe(false);
  });

  it('gives staff members calendar view/create/edit but not sync', () => {
    expect(member.has(Permissions.CALENDAR_VIEW)).toBe(true);
    expect(member.has(Permissions.CALENDAR_CREATE)).toBe(true);
    expect(member.has(Permissions.CALENDAR_EDIT)).toBe(true);
    expect(member.has(Permissions.CALENDAR_SYNC)).toBe(false);
    expect(member.has(Permissions.CONTENT_VIEW)).toBe(true);
  });

  it('gives owner and admin calendar sync for Google connect', () => {
    expect(admin.has(Permissions.CALENDAR_SYNC)).toBe(true);
    expect(owner.has(Permissions.CALENDAR_SYNC)).toBe(true);
    expect(admin.has(Permissions.CALENDAR_VIEW)).toBe(true);
    expect(owner.has(Permissions.CONTENT_VIEW)).toBe(true);
  });
});
