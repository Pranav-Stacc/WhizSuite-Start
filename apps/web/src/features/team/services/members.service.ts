import 'server-only';
import { Permissions, type MemberAccess, type Permission } from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { can } from '@/shared/auth/permissions';
import { orgPath } from '@/shared/api/live/utils';
import { invitationsLive, membersLive } from '@/shared/api/live/bindings';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { membersRepository, type Member } from '../data/members.repository';

/** Client portal users have memberships too, but they are not part of the agency team. */
const CLIENT_MEMBERSHIP = 'CLIENT';

type RawRecord = Record<string, unknown>;

export interface DirectoryEntry {
  name: string;
  isClient: boolean;
}

/** Lists the caller is not permitted to read resolve to empty without calling the API. */
async function fetchPermitted(permission: Permission, path: string, tag: string): Promise<RawRecord[]> {
  if (!(await can(permission))) return [];
  return unwrapList(await apiFetch<unknown>(path, { tags: [tag] }));
}

async function liveMemberships(org: string): Promise<RawRecord[]> {
  return fetchPermitted(Permissions.MEMBERS_VIEW, membersLive.path(org), `org:${org}:${membersLive.tag}`);
}

export async function listMembers(): Promise<Member[]> {
  if (!isLiveMode) return membersRepository.list();
  const org = (await getSession())?.orgId ?? '';
  if (!org) return [];
  const [memberships, invites] = await Promise.all([
    liveMemberships(org),
    fetchPermitted(Permissions.MEMBERS_INVITE, invitationsLive.path(org), `org:${org}:${invitationsLive.tag}`),
  ]);
  const team = memberships.filter((raw) => raw.membershipType !== CLIENT_MEMBERSHIP).map(membersLive.fromApi);
  const joined = new Set(team.map((m) => m.email.toLowerCase()));
  const pending = invites
    .filter((raw) => raw.membershipType !== CLIENT_MEMBERSHIP)
    .map(invitationsLive.fromApi)
    .filter((m) => m.status === 'INVITED' && !joined.has(m.email.toLowerCase()));
  return [...team, ...pending];
}

/** Everyone who can author messages — agency members and client users — keyed by user id. */
export async function memberDirectory(): Promise<Map<string, DirectoryEntry>> {
  if (!isLiveMode) return new Map((await membersRepository.list()).map((m) => [m.id, { name: m.name, isClient: false }]));
  const session = await getSession();
  const org = session?.orgId ?? '';
  const directory = new Map<string, DirectoryEntry>();
  if (!org || !session) return directory;
  for (const raw of await liveMemberships(org)) {
    const member = membersLive.fromApi(raw);
    directory.set(member.id, { name: member.name, isClient: raw.membershipType === CLIENT_MEMBERSHIP });
  }
  if (!directory.has(session.userId)) directory.set(session.userId, { name: session.name, isClient: session.role === 'client' });
  return directory;
}

export async function membersById(): Promise<Map<string, Member>> {
  return new Map((await listMembers()).map((m) => [m.id, m]));
}

export async function getMember(id: string): Promise<Member | undefined> {
  return (await membersById()).get(id);
}

export async function getMemberAccess(userId: string): Promise<MemberAccess | null> {
  if (!isLiveMode) return { roles: [], overrides: [], effectivePermissions: [] };
  const org = (await getSession())?.orgId ?? '';
  if (!org) return null;
  try {
    return await apiFetch<MemberAccess>(`${orgPath(org, 'members')}/${userId}/access`, {
      tags: [`org:${org}:team`],
    });
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

export async function memberName(id: string | undefined): Promise<string | undefined> {
  return id ? (await memberDirectory()).get(id)?.name : undefined;
}
