import { createHmac } from 'node:crypto';
import type { MembershipType, UserRole } from '@agency-os/contracts';

export const SESSION_COOKIE = 'ao_session';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me';

const MEMBERSHIP_TO_ROLE: Record<MembershipType, UserRole> = {
  OWNER: 'owner',
  ADMIN: 'manager',
  MEMBER: 'creator',
  CLIENT: 'client',
};

export interface E2eSessionPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgName: string;
  orgSlug?: string;
  clientId?: string;
  accessToken: string;
  refreshToken: string;
  demo: boolean;
}

export function membershipRole(accessToken: string): UserRole {
  const payload = accessToken.split('.')[1];
  if (!payload) return 'creator';
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    membershipType?: MembershipType;
  };
  return claims.membershipType ? MEMBERSHIP_TO_ROLE[claims.membershipType] : 'creator';
}

export function encodeSessionCookie(session: E2eSessionPayload): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
