import 'server-only';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { invitationsLive, membersLive } from '@/shared/api/live/bindings';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { membersRepository, type Member } from '../data/members.repository';

const FORBIDDEN = 403;
/** Client portal users have memberships too, but they are not part of the agency team. */
const CLIENT_MEMBERSHIP = 'CLIENT';

type RawRecord = Record<string, unknown>;

export interface DirectoryEntry {
  name: string;
  isClient: boolean;
}

/** Lists the caller may not be allowed to see resolve to empty rather than failing the page. */
async function fetchVisible(path: string, tag: string): Promise<RawRecord[]> {
  try {
    return unwrapList(await apiFetch<unknown>(path, { tags: [tag] }));
  } catch (error) {
    if (error instanceof ApiError && error.status === FORBIDDEN) return [];
    throw error;
  }
}

async function liveMemberships(org: string): Promise<RawRecord[]> {
  return fetchVisible(membersLive.path(org), `org:${org}:${membersLive.tag}`);
}

export async function listMembers(): Promise<Member[]> {
  if (!isLiveMode) return membersRepository.list();
  const org = (await getSession())?.orgId ?? '';
  if (!org) return [];
  const [memberships, invites] = await Promise.all([
    liveMemberships(org),
    fetchVisible(invitationsLive.path(org), `org:${org}:${invitationsLive.tag}`),
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

export async function memberName(id: string | undefined): Promise<string | undefined> {
  return id ? (await memberDirectory()).get(id)?.name : undefined;
}
