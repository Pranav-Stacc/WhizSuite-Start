import 'server-only';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';

export interface InvitationPreview {
  email: string;
  organizationName: string;
  membershipType: string;
  expiresAt: string;
  hasAccount: boolean;
}

/** Undefined when the token is unknown, used or expired. */
export async function fetchInvitationPreview(token: string): Promise<InvitationPreview | undefined> {
  if (!isLiveMode || !token) return undefined;
  try {
    return await apiFetch<InvitationPreview>('v1/invitations/preview', { query: { token }, token: '' });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) return undefined;
    throw error;
  }
}
