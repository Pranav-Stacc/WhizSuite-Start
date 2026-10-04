import 'server-only';
import { DEFAULT_CLIENT_COLOR, INITIAL_HEALTH_SCORE } from '../config';
import { clientsRepository, type Client } from '../data/clients.repository';

export interface NewClientInput {
  name: string;
  ownerId: string;
  industry?: string;
  website?: string;
  tier?: string;
  contactName?: string;
  contactEmail?: string;
  retainerMinor?: number;
}

/** Creates a client in the ONBOARDING state with the default brand kit. Shared by manual creation and lead conversion. */
export async function onboardClient(input: NewClientInput): Promise<Client> {
  return clientsRepository.create({
    name: input.name,
    industry: input.industry ?? '',
    website: input.website ?? '',
    tier: input.tier ?? '',
    status: 'ONBOARDING',
    color: DEFAULT_CLIENT_COLOR,
    contactName: input.contactName ?? '',
    contactEmail: input.contactEmail ?? '',
    health: INITIAL_HEALTH_SCORE,
    retainerMinor: input.retainerMinor ?? 0,
    platforms: [],
    since: new Date().toISOString(),
    ownerId: input.ownerId,
    brand: { primary: DEFAULT_CLIENT_COLOR, secondary: '#0B1513', accent: '#F5F7F6', voice: '', hashtags: [], pillars: [] },
  });
}

export async function listClients(): Promise<Client[]> {
  return clientsRepository.list();
}

export async function getClient(id: string): Promise<Client | undefined> {
  return clientsRepository.get(id);
}

export async function clientsById(): Promise<Map<string, Client>> {
  return new Map((await listClients()).map((c) => [c.id, c]));
}

export function monthlyRecurring(clients: Client[]): number {
  return clients.filter((c) => c.status === 'ACTIVE' || c.status === 'ONBOARDING').reduce((acc, c) => acc + c.retainerMinor, 0);
}
