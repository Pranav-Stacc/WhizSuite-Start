import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { loadIf } from '@/shared/auth/permissions';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { unwrapList } from '@/shared/api/live/utils';
import { listClients } from '@/features/clients/services/clients.service';
import { listDepartments } from '@/features/departments/services/departments.service';
import { listProjects } from '@/features/projects/services/projects.service';
import type { ScopeResourceOptions } from '../components/scope-resource-fields';

interface TeamRow {
  id: string;
  name: string;
}

async function listTeamsLive(): Promise<TeamRow[]> {
  const org = (await getSession())?.orgId;
  if (!org) return [];
  const rows = unwrapList(await apiFetch<unknown>(`v1/organizations/${org}/teams`, { tags: [`org:${org}:teams`] }));
  return rows.map((row) => ({
    id: String((row as Record<string, unknown>).id ?? ''),
    name: String((row as Record<string, unknown>).name ?? ''),
  })).filter((row) => row.id && row.name);
}

/** Options for role-assignment scope resource pickers (department / team / client / project). */
export async function loadScopeResources(): Promise<ScopeResourceOptions> {
  const [departments, clients, projects, teams] = await Promise.all([
    loadIf(Permissions.ORG_VIEW, listDepartments, []),
    loadIf(Permissions.CLIENTS_VIEW, listClients, []),
    loadIf(Permissions.PROJECTS_VIEW, listProjects, []),
    isLiveMode
      ? loadIf(Permissions.ORG_VIEW, listTeamsLive, [])
      : Promise.resolve([
          { id: 'team-creative', name: 'Creative' },
          { id: 'team-accounts', name: 'Accounts' },
        ]),
  ]);

  return {
    departments: departments.map((d) => ({ id: d.id, label: d.name })),
    teams: teams.map((t) => ({ id: t.id, label: t.name })),
    clients: clients.map((c) => ({ id: c.id, label: c.name })),
    projects: projects.map((p) => ({ id: p.id, label: p.name })),
  };
}
