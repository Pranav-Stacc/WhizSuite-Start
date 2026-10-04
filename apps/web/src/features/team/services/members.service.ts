import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import { invitationsLive } from '@/shared/api/live/bindings';
import { unwrapList } from '@/shared/api/live/utils';
import { isLiveMode } from '@/shared/config/env';
import { getSession } from '@/shared/auth/session';
import { membersRepository, type Member, type MemberRole } from '../data/members.repository';

function sessionMember(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): Member {
  const role = session.role as MemberRole;
  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    role,
    title: '',
    capacityHours: 40,
    skills: [],
    status: 'ACTIVE',
    joinedAt: new Date().toISOString(),
  };
}

export async function listMembers(): Promise<Member[]> {
  if (isLiveMode) {
    const session = await getSession();
    const org = session?.orgId ?? '';
    if (!org || !session) return [];
    const data = await apiFetch<unknown>(invitationsLive.path(org), { tags: [`org:${org}:${invitationsLive.tag}`] });
    const invites = unwrapList(data).map(invitationsLive.fromApi);
    const self = sessionMember(session);
    const others = invites.filter((m) => m.email.toLowerCase() !== session.email.toLowerCase());
    return [self, ...others];
  }
  return membersRepository.list();
}

export async function membersById(): Promise<Map<string, Member>> {
  return new Map((await listMembers()).map((m) => [m.id, m]));
}

export async function memberName(id: string | undefined): Promise<string | undefined> {
  return id ? (await membersById()).get(id)?.name : undefined;
}
