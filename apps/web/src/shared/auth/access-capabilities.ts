import 'server-only';
import { cache } from 'react';
import type { AccessCapabilities } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { isLiveMode } from '@/shared/config/env';
import { requireSession } from './session';

/** Live org access snapshot (permissions + assigned roles). Null in demo or when the API is unreachable. */
export const getAccessCapabilities = cache(async (): Promise<AccessCapabilities | null> => {
  const session = await requireSession();
  if (!isLiveMode || session.demo) return null;
  try {
    return await apiFetch<AccessCapabilities>('v1/access/capabilities');
  } catch {
    return null;
  }
});
