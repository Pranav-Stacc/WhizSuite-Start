import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { loadIf } from '@/shared/auth/permissions';
import { listCalendarItems } from '@/features/calendar/services/calendar.service';
import { listClients } from '@/features/clients/services/clients.service';
import { listContent } from '@/features/content/services/content.service';
import { listProjects } from '@/features/projects/services/projects.service';
import { listMembers } from '@/features/team/services/members.service';
import type { MentionCandidate } from '../components/send-message-form';

const MAX_PER_KIND = 40;

function cap<T>(rows: T[]): T[] {
  return rows.length <= MAX_PER_KIND ? rows : rows.slice(0, MAX_PER_KIND);
}

/** Mention targets for @ autocomplete in chat (people + linked work objects). */
export async function buildChatMentionCandidates(viewerId: string): Promise<MentionCandidate[]> {
  const [members, clients, projects, posts, calendar] = await Promise.all([
    loadIf(Permissions.MEMBERS_VIEW, listMembers, []),
    loadIf(Permissions.CLIENTS_VIEW, listClients, []),
    loadIf(Permissions.PROJECTS_VIEW, listProjects, []),
    loadIf(Permissions.CONTENT_VIEW, listContent, []),
    loadIf(Permissions.CALENDAR_VIEW, async () => {
      const from = new Date();
      from.setDate(from.getDate() - 45);
      const to = new Date();
      to.setDate(to.getDate() + 120);
      return listCalendarItems({ from: from.toISOString(), to: to.toISOString() });
    }, []),
  ]);

  const people: MentionCandidate[] = members
    .filter((m) => m.id !== viewerId && m.status !== 'INVITED')
    .map((m) => ({
      id: m.id,
      label: m.name.split(' ')[0] || m.name,
      type: 'USER',
      subtitle: m.name,
      href: `/team/${m.id}`,
    }));

  const clientRows: MentionCandidate[] = cap(clients).map((c) => ({
    id: c.id,
    label: c.name,
    type: 'CLIENT',
    subtitle: 'Client',
    href: `/clients/${c.id}`,
  }));

  const projectRows: MentionCandidate[] = cap(projects).map((p) => ({
    id: p.id,
    label: p.name,
    type: 'PROJECT',
    subtitle: 'Project',
    href: `/projects/${p.id}`,
  }));

  const contentRows: MentionCandidate[] = cap(posts).map((post) => ({
    id: post.id,
    label: post.title || post.caption.slice(0, 48) || post.id.slice(0, 8),
    type: 'CONTENT',
    subtitle: 'Content',
    href: `/content/${post.id}`,
  }));

  const calendarRows: MentionCandidate[] = cap(calendar).map((item) => ({
    id: item.storedId ?? item.id,
    label: item.title,
    type: 'CALENDAR_EVENT',
    subtitle: 'Calendar',
    href: item.href || `/calendar?item=${encodeURIComponent(item.id)}`,
  }));

  return [...people, ...clientRows, ...projectRows, ...contentRows, ...calendarRows];
}
