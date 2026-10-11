import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { can } from '@/shared/auth/permissions';

export interface ClientContactRow {
  id: string;
  clientId: string;
  firstName: string;
  lastName?: string;
  label: string;
  email?: string;
  role?: string;
}

type Raw = Record<string, unknown>;

function contactLabel(raw: Raw): string {
  const first = typeof raw.firstName === 'string' ? raw.firstName : '';
  const last = typeof raw.lastName === 'string' ? raw.lastName : '';
  const name = `${first} ${last}`.trim();
  const client = raw.client as Raw | undefined;
  const clientName =
    client && typeof client.displayName === 'string'
      ? client.displayName
      : '';
  return clientName ? `${name} · ${clientName}` : name;
}

export async function listClientContacts(
  clientId?: string,
): Promise<ClientContactRow[]> {
  if (!(await can(Permissions.CLIENTS_VIEW))) return [];
  const session = await getSession();
  if (!session?.orgId) return [];
  const query = clientId ? `?clientId=${clientId}` : '';
  const rows = await apiFetch<Raw[]>(
    `v1/organizations/${session.orgId}/client-contacts${query}`,
    { tags: [`org:${session.orgId}:client-contacts`] },
  );
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const firstName = typeof row.firstName === 'string' ? row.firstName : '';
    const lastName = typeof row.lastName === 'string' ? row.lastName : undefined;
    return {
      id: String(row.id ?? ''),
      clientId: String(row.clientId ?? ''),
      firstName,
      lastName,
      label: contactLabel(row),
      email: typeof row.email === 'string' ? row.email : undefined,
      role: typeof row.role === 'string' ? row.role : undefined,
    };
  });
}
