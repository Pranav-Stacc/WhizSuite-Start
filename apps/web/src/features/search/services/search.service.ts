import 'server-only';
import { Permissions, type Permission } from '@agency-os/contracts';
import { formatMoney } from '@/shared/lib/format';
import type { SearchGroup } from '@/features/shell/components/search-types';
import { clientsRepository } from '@/features/clients/data/clients.repository';
import { contentRepository } from '@/features/content/data/content.repository';
import { invoiceTotals, invoicesRepository } from '@/features/invoices/data/invoices.repository';
import { knowledgeRepository } from '@/features/knowledge/data/knowledge.repository';
import { leadsRepository } from '@/features/leads/data/leads.repository';
import { projectsRepository } from '@/features/projects/data/projects.repository';
import { tasksRepository } from '@/features/tasks/data/tasks.repository';

const PER_GROUP = 5;

const matches = (needle: string, ...fields: Array<string | undefined>): boolean => fields.some((f) => f?.toLowerCase().includes(needle));

/**
 * Cross-domain quick search for the command palette. Composes each domain's public data; never joins tables.
 * Only domains the member may read are queried, mirroring the API's permission checks.
 */
export async function searchWorkspace(query: string, granted: ReadonlySet<Permission>): Promise<SearchGroup[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const whenAllowed = <T,>(permission: Permission, load: () => Promise<T[]>): Promise<T[]> => (granted.has(permission) ? load() : Promise.resolve([]));

  const [clients, tasks, content, projects, leads, invoices, articles] = await Promise.all([
    whenAllowed(Permissions.CLIENTS_VIEW, () => clientsRepository.list()),
    whenAllowed(Permissions.TASKS_VIEW, () => tasksRepository.list()),
    whenAllowed(Permissions.CONTENT_VIEW, () => contentRepository.list()),
    whenAllowed(Permissions.PROJECTS_VIEW, () => projectsRepository.list()),
    whenAllowed(Permissions.LEADS_VIEW, () => leadsRepository.list()),
    whenAllowed(Permissions.INVOICES_VIEW, () => invoicesRepository.list()),
    whenAllowed(Permissions.ORG_VIEW, () => knowledgeRepository.list()),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const groups: SearchGroup[] = [
    {
      type: 'client',
      label: 'search.type.client',
      items: clients.filter((c) => matches(needle, c.name, c.industry, c.contactName)).slice(0, PER_GROUP).map((c) => ({ id: c.id, title: c.name, subtitle: c.industry, href: `/clients/${c.id}` })),
    },
    {
      type: 'task',
      label: 'search.type.task',
      items: tasks.filter((x) => matches(needle, x.title)).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.title, subtitle: clientName.get(x.clientId), href: `/tasks?q=${encodeURIComponent(x.title)}` })),
    },
    {
      type: 'content',
      label: 'search.type.content',
      items: content.filter((x) => matches(needle, x.title, x.caption)).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.title, subtitle: clientName.get(x.clientId), href: `/content/${x.id}` })),
    },
    {
      type: 'project',
      label: 'search.type.project',
      items: projects.filter((x) => matches(needle, x.name)).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.name, subtitle: clientName.get(x.clientId), href: `/projects/${x.id}` })),
    },
    {
      type: 'lead',
      label: 'search.type.lead',
      items: leads.filter((x) => matches(needle, x.company, x.contact)).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.company, subtitle: x.contact, href: '/leads' })),
    },
    {
      type: 'invoice',
      label: 'search.type.invoice',
      items: invoices.filter((x) => matches(needle, x.number, clientName.get(x.clientId))).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.number, subtitle: `${clientName.get(x.clientId) ?? ''} · ${formatMoney(invoiceTotals(x).total)}`, href: `/invoices/${x.id}` })),
    },
    {
      type: 'article',
      label: 'search.type.article',
      items: articles.filter((x) => matches(needle, x.title, x.body)).slice(0, PER_GROUP).map((x) => ({ id: x.id, title: x.title, href: `/knowledge/${x.id}` })),
    },
  ];
  return groups.filter((g) => g.items.length > 0);
}
