'use server';

import { redirect } from 'next/navigation';
import {
  UserRoles,
  loginSchema,
  registerSchema,
  type MembershipType,
  type UserRole,
} from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import { DEMO_ORG_ID, DEMO_ORG_NAME, DEMO_PASSWORD, homeFor, personaByEmail, personaByRole, type Persona } from '@/shared/auth/roles';
import { endSession, getSession, startSession, type Session } from '@/shared/auth/session';
import { fail, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';

interface AuthResponse {
  user: { id: string; email: string; firstName: string; lastName?: string | null };
  organizationId?: string;
  organization?: { id: string; name: string };
  accessToken: string;
  refreshToken: string;
}

const MEMBERSHIP_TO_ROLE: Record<MembershipType, UserRole> = {
  OWNER: UserRoles.OWNER,
  ADMIN: UserRoles.MANAGER,
  MEMBER: UserRoles.CREATOR,
  CLIENT: UserRoles.CLIENT,
};

function roleFromToken(accessToken: string): UserRole {
  const payload = accessToken.split('.')[1];
  if (!payload) return UserRoles.CREATOR;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { membershipType?: MembershipType };
  return claims.membershipType ? MEMBERSHIP_TO_ROLE[claims.membershipType] : UserRoles.CREATOR;
}

function sessionFromPersona(persona: Persona): Session {
  return {
    userId: persona.userId,
    name: persona.name,
    email: persona.email,
    role: persona.role,
    orgId: DEMO_ORG_ID,
    orgName: DEMO_ORG_NAME,
    clientId: persona.clientId,
    demo: true,
  };
}

function sessionFromApi(response: AuthResponse, fallbackOrgName: string): Session {
  const role = roleFromToken(response.accessToken);
  return {
    userId: response.user.id,
    name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' '),
    email: response.user.email,
    role,
    orgId: response.organization?.id ?? response.organizationId ?? '',
    orgName: response.organization?.name ?? fallbackOrgName,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    demo: false,
  };
}

export async function loginAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseInput(loginSchema, raw);
    if (!parsed.ok) return parsed.result;
    const { email, password } = parsed.data;

    let session: Session;
    if (isLiveMode) {
      try {
        const response = await apiFetch<AuthResponse>('v1/auth/login', { method: 'POST', body: { email, password } });
        session = sessionFromApi(response, 'Workspace');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return fail(t('auth.login.invalid'));
        return fail(t('auth.login.unavailable'));
      }
    } else {
      const persona = personaByEmail(email);
      if (!persona || password !== DEMO_PASSWORD) return fail(t('auth.login.invalid'));
      session = sessionFromPersona(persona);
    }

    await startSession(session);
    await recordAudit({ action: 'auth.login', entityType: 'session', entityId: session.userId, entityLabel: session.email, summary: 'Signed in' });
    redirect(homeFor(session.role));
  });
}

/** Demo-only one-click entry. Disabled when the app is wired to a live API. */
export async function enterAsPersonaAction(role: UserRole): Promise<void> {
  if (isLiveMode) redirect('/login');
  const persona = personaByRole(role);
  await startSession(sessionFromPersona(persona));
  await recordAudit({ action: 'auth.login', entityType: 'session', entityId: persona.userId, entityLabel: persona.email, summary: 'Signed in (demo persona)' });
  redirect(homeFor(persona.role));
}

export async function registerAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseInput(registerSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;

    let session: Session;
    if (isLiveMode) {
      try {
        const response = await apiFetch<AuthResponse>('v1/auth/register', { method: 'POST', body: input });
        session = sessionFromApi(response, input.organizationName);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) return fail(t('auth.register.exists'));
        return fail(t('auth.login.unavailable'));
      }
    } else {
      const owner = personaByRole(UserRoles.OWNER);
      session = { ...sessionFromPersona(owner), name: [input.firstName, input.lastName].filter(Boolean).join(' '), email: input.email, orgName: input.organizationName };
    }

    await startSession(session);
    redirect(homeFor(session.role));
  });
}

export async function switchPersonaAction(role: UserRole): Promise<void> {
  const current = await getSession();
  if (!current?.demo) return;
  await startSession(sessionFromPersona(personaByRole(role)));
  redirect(homeFor(role));
}

export async function signOutAction(): Promise<void> {
  const session = await getSession();
  if (session?.refreshToken) {
    await apiFetch('v1/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken } }).catch(() => undefined);
  }
  if (session) {
    await recordAudit({ action: 'auth.logout', entityType: 'session', entityId: session.userId, entityLabel: session.email, summary: 'Signed out' });
  }
  await endSession();
  redirect('/login');
}
