import 'server-only';
import { cache } from 'react';
import { clientsRepository } from '@/features/clients/data/clients.repository';
import { getActiveWorkspaceId, listTenancyWorkspaces } from '@/shared/api/live/workspace';
import { TENANCY_WORKSPACE_UI_ENABLED } from '@/shared/workspace/tenancy-ui';

/** Client ids in the active tenancy workspace (empty set when the workspace has no clients). */
export const activeWorkspaceClientIds = cache(async (): Promise<Set<string>> => {
  const clients = await clientsRepository.list();
  return new Set(clients.map((c) => c.id));
});

export const activeWorkspaceSummary = cache(async () => {
  const [workspaces, activeId] = await Promise.all([listTenancyWorkspaces(), getActiveWorkspaceId()]);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  return { active, workspaces, uiEnabled: TENANCY_WORKSPACE_UI_ENABLED };
});

export function filterByWorkspaceClients<T extends { clientId?: string }>(
  items: readonly T[],
  clientIds: Set<string>,
): T[] {
  return items.filter((item) => item.clientId && clientIds.has(item.clientId));
}
