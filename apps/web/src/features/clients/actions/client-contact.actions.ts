'use server';

import { z } from 'zod';
import { Permissions } from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';

const createSchema = z.object({
  clientId: z.string().uuid(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.string().trim().optional(),
});

export async function createClientContactAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await authorize(Permissions.CLIENTS_EDIT);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) return fail(t('validation.required'));
    const session = await getSession();
    if (!session?.orgId) return fail(t('auth.login.invalid'));
    const body = {
      ...parsed.data,
      email: parsed.data.email || undefined,
    };
    const row = await apiFetch<{ id: string }>(
      `v1/organizations/${session.orgId}/client-contacts`,
      { method: 'POST', body },
    );
    await refreshData('clients');
    return succeed({ id: row.id }, t('clients.contacts.created'));
  });
}

const updateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.string().trim().optional(),
});

export async function updateClientContactAction(
  contactId: string,
  raw: unknown,
): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CLIENTS_EDIT);
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) return fail(t('validation.required'));
    const session = await getSession();
    if (!session?.orgId) return fail(t('auth.login.invalid'));
    const body = {
      ...parsed.data,
      email: parsed.data.email || undefined,
    };
    await apiFetch(`v1/organizations/${session.orgId}/client-contacts/${contactId}`, {
      method: 'PATCH',
      body,
    });
    await refreshData('clients');
    return succeed(undefined, t('clients.contacts.updated'));
  });
}

export async function deleteClientContactAction(
  contactId: string,
): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.CLIENTS_EDIT);
    const session = await getSession();
    if (!session?.orgId) return fail(t('auth.login.invalid'));
    await apiFetch(
      `v1/organizations/${session.orgId}/client-contacts/${contactId}`,
      { method: 'DELETE' },
    );
    await refreshData('clients');
    return succeed(undefined, t('clients.contacts.deleted'));
  });
}
