import 'server-only';
import type { NotificationTypeKey } from '@agency-os/contracts';
import { createRepository, type Entity } from '@/shared/data/repository';

/** Demo-mode store for a user's profile and in-app notification choices; live mode uses the API. */
export interface Preferences extends Entity {
  displayName?: string;
  title?: string;
  notifications: Partial<Record<NotificationTypeKey, boolean>>;
}

export const preferencesRepository = createRepository<Preferences>('preferences', () => []);
