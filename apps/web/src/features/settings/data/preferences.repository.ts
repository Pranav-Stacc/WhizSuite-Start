import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';

export const PreferenceKeys = ['emailApprovals', 'emailDigest', 'pushMentions', 'pushTasks', 'mfa'] as const;
export type PreferenceKey = (typeof PreferenceKeys)[number];

export interface Preferences extends Entity, Record<PreferenceKey, boolean> {
  displayName?: string;
  title?: string;
}

const DEFAULTS: Record<PreferenceKey, boolean> = {
  emailApprovals: true,
  emailDigest: true,
  pushMentions: true,
  pushTasks: false,
  mfa: false,
};

export const preferencesRepository = createRepository<Preferences>('preferences', () => []);

export async function getPreferences(userId: string): Promise<Preferences> {
  const existing = await preferencesRepository.get(userId);
  return existing ?? { id: userId, ...DEFAULTS };
}
