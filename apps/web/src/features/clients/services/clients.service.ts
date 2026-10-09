import 'server-only';
import type { Platform } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { listContent } from '@/features/content/services/content.service';
import { listInvoices } from '@/features/invoices/services/invoices.service';
import { DEFAULT_CLIENT_COLOR, HEALTH_BASELINE, HEALTH_PENALTIES, INITIAL_HEALTH_SCORE } from '../config';
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

interface RiskSignals {
  overdueInvoices: number;
  changesRequested: number;
}

/** Scores health from the account's live risk signals instead of a stored guess. */
function scoreHealth(client: Client, signals: RiskSignals | undefined): number {
  const penalty =
    (signals?.overdueInvoices ?? 0) * HEALTH_PENALTIES.overdueInvoice +
    (signals?.changesRequested ?? 0) * HEALTH_PENALTIES.changesRequested +
    (client.retainerMinor > 0 ? 0 : HEALTH_PENALTIES.noRetainer);
  return Math.max(0, HEALTH_BASELINE - penalty);
}

async function riskSignalsByClient(): Promise<Map<string, RiskSignals>> {
  const [invoices, posts] = await Promise.all([listInvoices(), listContent()]);
  const signals = new Map<string, RiskSignals>();
  const bump = (clientId: string, key: keyof RiskSignals) => {
    const entry = signals.get(clientId) ?? { overdueInvoices: 0, changesRequested: 0 };
    entry[key] += 1;
    signals.set(clientId, entry);
  };
  for (const invoice of invoices) if (invoice.status === 'OVERDUE') bump(invoice.clientId, 'overdueInvoices');
  for (const post of posts) if (post.status === 'CHANGES_REQUESTED') bump(post.clientId, 'changesRequested');
  return signals;
}

async function withLiveHealth(clients: Client[]): Promise<Client[]> {
  if (!isLiveMode || clients.length === 0) return clients;
  const signals = await riskSignalsByClient();
  return clients.map((client) => ({ ...client, health: scoreHealth(client, signals.get(client.id)) }));
}

export async function listClients(): Promise<Client[]> {
  return withLiveHealth(await clientsRepository.list());
}

/** Keeps the client's channel list in step with its connected integrations. */
export async function setClientPlatforms(clientId: string, platforms: Platform[]): Promise<void> {
  await clientsRepository.update(clientId, { platforms });
}

export async function getClient(id: string): Promise<Client | undefined> {
  const client = await clientsRepository.get(id);
  return client ? (await withLiveHealth([client]))[0] : undefined;
}

export async function clientsById(): Promise<Map<string, Client>> {
  return new Map((await listClients()).map((c) => [c.id, c]));
}

export function monthlyRecurring(clients: Client[]): number {
  return clients.filter((c) => c.status === 'ACTIVE' || c.status === 'ONBOARDING').reduce((acc, c) => acc + c.retainerMinor, 0);
}
