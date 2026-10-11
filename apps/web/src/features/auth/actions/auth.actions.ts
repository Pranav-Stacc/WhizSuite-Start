'use server';

import { redirect } from 'next/navigation';
import {
  UserRoles,
  acceptInvitationSchema,
  claimPortalAccessSchema,
  googleAuthSchema,
  loginSchema,
  redeemPortalAccessSchema,
  registerSchema,
  type MembershipType,
  type UserRole,
} from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import {
  DEMO_ORG_ID,
  DEMO_ORG_NAME,
  DEMO_PASSWORD,
  MEMBERSHIP_TO_ROLE,
  homeFor,
  personaByEmail,
  personaByRole,
  type Persona,
} from '@/shared/auth/roles';
import { endSession, getSession, startSession, type Session } from '@/shared/auth/session';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { applyOrganizationTheme } from '@/shared/theme/org-theme';
import { env } from '@/shared/config/env';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { workspaceHref } from '@/shared/workspace/host';

/** Writes the session and hydrates the agency theme so every member sees the same colours. */
async function beginAuthenticatedSession(session: Session): Promise<void> {
  await startSession(session);
  if (session.accessToken && session.orgId) {
    await applyOrganizationTheme({ orgId: session.orgId, accessToken: session.accessToken });
  }
}

/** Prefer `{slug}.{APP_ROOT_DOMAIN}` so Main/CRM/Finance SSO cookies apply. */
function redirectAfterAuth(session: Session): never {
  const path = homeFor(session.role);
  const root =
    env.APP_ROOT_DOMAIN?.trim() || process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN?.trim() || undefined;
  if (root && session.orgSlug) {
    redirect(
      workspaceHref({
        module: 'main',
        orgSlug: session.orgSlug,
        rootDomain: root,
        path,
      }),
    );
  }
  redirect(path);
}

interface AuthResponse {
  user: { id: string; email: string; firstName: string; lastName?: string | null };
  organizationId?: string;
  organization?: { id: string; name: string; slug?: string };
  accessToken: string;
  refreshToken: string;
}

interface AccessClaims {
  membershipType?: MembershipType;
  clientId?: string;
}

function claimsOf(accessToken: string): AccessClaims {
  const payload = accessToken.split('.')[1];
  if (!payload) return {};
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as AccessClaims;
}

function sessionFromPersona(persona: Persona): Session {
  return {
    userId: persona.userId,
    name: persona.name,
    email: persona.email,
    role: persona.role,
    orgId: DEMO_ORG_ID,
    orgName: DEMO_ORG_NAME,
    orgSlug: 'demo',
    clientId: persona.clientId,
    demo: true,
  };
}

async function organizationProfile(
  response: AuthResponse,
  orgId: string,
): Promise<{ name: string; slug?: string }> {
  if (response.organization?.name) {
    return {
      name: response.organization.name,
      slug: response.organization.slug,
    };
  }
  if (!orgId) return { name: 'Organization' };
  try {
    const org = await apiFetch<{ name: string; slug?: string }>('v1/organizations/current', {
      token: response.accessToken,
      organizationId: orgId,
    });
    if (!org?.name) return { name: 'Organization' };
    return { name: org.name, slug: org.slug };
  } catch {
    return { name: 'Organization' };
  }
}

async function sessionFromApi(response: AuthResponse): Promise<Session> {
  const claims = claimsOf(response.accessToken);
  const orgId = response.organization?.id ?? response.organizationId ?? '';
  const org = await organizationProfile(response, orgId);
  return {
    userId: response.user.id,
    name: [response.user.firstName, response.user.lastName].filter(Boolean).join(' '),
    email: response.user.email,
    role: claims.membershipType ? MEMBERSHIP_TO_ROLE[claims.membershipType] : UserRoles.CREATOR,
    orgId,
    orgName: org.name,
    orgSlug: org.slug,
    clientId: claims.clientId,
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
      let response: AuthResponse;
      try {
        response = await apiFetch<AuthResponse>('v1/auth/login', { method: 'POST', body: { email, password } });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return fail(t('auth.login.invalid'));
        return fail(t('auth.login.unavailable'));
      }
      try {
        session = await sessionFromApi(response);
      } catch {
        return fail(t('auth.login.unavailable'));
      }
    } else {
      const persona = personaByEmail(email);
      if (!persona || password !== DEMO_PASSWORD) return fail(t('auth.login.invalid'));
      session = sessionFromPersona(persona);
    }

    await beginAuthenticatedSession(session);
    await recordAudit({ action: 'auth.login', entityType: 'session', entityId: session.userId, entityLabel: session.email, summary: 'Signed in' });
    redirectAfterAuth(session);
  });
}

export async function googleAuthAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseInput(googleAuthSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('auth.google.demoOnly'));

    let session: Session;
    try {
      const response = await apiFetch<AuthResponse>('v1/auth/google', {
        method: 'POST',
        body: parsed.data,
      });
      session = await sessionFromApi(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return fail(t('auth.google.noAccount'));
      if (error instanceof ApiError && error.status === 409) return fail(t('auth.register.exists'));
      if (error instanceof ApiError && error.status === 401) return fail(t('auth.google.invalid'));
      if (error instanceof ApiError && error.status === 503) return fail(t('auth.google.disabled'));
      return fail(t('auth.login.unavailable'));
    }

    await beginAuthenticatedSession(session);
    await recordAudit({
      action: 'auth.google_login',
      entityType: 'session',
      entityId: session.userId,
      entityLabel: session.email,
      summary: 'Signed in with Google',
    });
    redirectAfterAuth(session);
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
        session = await sessionFromApi(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) return fail(t('auth.register.exists'));
        return fail(t('auth.login.unavailable'));
      }
    } else {
      const owner = personaByRole(UserRoles.OWNER);
      session = {
        ...sessionFromPersona(owner),
        name: [input.firstName, input.lastName].filter(Boolean).join(' '),
        email: input.email,
        orgName: input.organizationName,
        orgSlug: input.organizationSlug,
      };
    }

    await beginAuthenticatedSession(session);
    redirectAfterAuth(session);
  });
}

export async function acceptInvitationAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseInput(acceptInvitationSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('auth.invite.unavailable'));

    let session: Session;
    try {
      const response = await apiFetch<AuthResponse>('v1/invitations/redeem', { method: 'POST', body: parsed.data });
      session = await sessionFromApi(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return fail(t('auth.invite.wrongPassword'), { password: 'auth.invite.wrongPassword' });
      if (error instanceof ApiError && error.status === 409) return fail(t('auth.invite.alreadyMember'));
      if (error instanceof ApiError && error.status === 400) return fail(t('auth.invite.invalid'));
      return fail(t('auth.login.unavailable'));
    }

    await beginAuthenticatedSession(session);
    await recordAudit({ action: 'auth.invitation_accepted', entityType: 'session', entityId: session.userId, entityLabel: session.email, summary: 'Accepted invitation' });
    redirectAfterAuth(session);
  });
}

export async function redeemPortalAccessAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseInput(redeemPortalAccessSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('auth.portalAccess.unavailable'));

    let session: Session;
    try {
      const response = await apiFetch<AuthResponse>('v1/portal-access/redeem', {
        method: 'POST',
        body: parsed.data,
      });
      session = await sessionFromApi(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return fail(t('auth.invite.wrongPassword'), { password: 'auth.invite.wrongPassword' });
      }
      if (error instanceof ApiError && error.status === 403) return fail(t('auth.portalAccess.domainBlocked'));
      if (error instanceof ApiError && error.status === 410) return fail(t('auth.portalAccess.exhausted'));
      if (error instanceof ApiError && error.status === 400) return fail(t('auth.portalAccess.invalid'));
      return fail(t('auth.login.unavailable'));
    }

    await beginAuthenticatedSession(session);
    await recordAudit({
      action: 'auth.portal_access_redeemed',
      entityType: 'session',
      entityId: session.userId,
      entityLabel: session.email,
      summary: 'Opened portal via shareable access link',
    });
    redirect(homeFor(session.role));
  });
}

/** Temporary portal user upgrades to a permanent password login. */
export async function claimPortalAccessAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await getSession();
    if (!session?.accessToken) return fail(t('auth.login.expired'));
    const parsed = parseInput(claimPortalAccessSchema, raw);
    if (!parsed.ok) return parsed.result;
    if (!isLiveMode) return fail(t('toast.failed'));
    try {
      await apiFetch('v1/portal-access/claim', {
        method: 'POST',
        body: parsed.data,
        token: session.accessToken,
        organizationId: session.orgId,
      });
    } catch {
      return fail(t('auth.portalAccess.claimFailed'));
    }
    await recordAudit({
      action: 'auth.portal_access_claimed',
      entityType: 'user',
      entityId: session.userId,
      entityLabel: session.email,
      summary: 'Claimed permanent portal login',
    });
    return succeed(undefined, t('auth.portalAccess.claimSuccess'));
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
