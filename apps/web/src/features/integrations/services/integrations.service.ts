import 'server-only';
import { integrationsRepository, type Integration } from '../data/integrations.repository';

export type { Integration };

export async function listIntegrations(): Promise<Integration[]> {
  return integrationsRepository.list();
}
