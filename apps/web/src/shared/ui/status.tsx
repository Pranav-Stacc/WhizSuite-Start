import type { ContentStatus, ClientStatus, InvoiceStatus, Priority, ProjectStatus, TaskStatus } from '@agency-os/contracts';
import { t, type MessageKey } from '@/shared/i18n/t';
import { Badge, type BadgeTone } from './badge';

type LeadStatus = 'NEW' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
type SentimentValue = 'positive' | 'neutral' | 'negative';

const TONES = {
  task: { TODO: 'neutral', IN_PROGRESS: 'info', IN_REVIEW: 'violet', DONE: 'success' } satisfies Record<TaskStatus, BadgeTone>,
  priority: { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' } satisfies Record<Priority, BadgeTone>,
  content: { DRAFT: 'neutral', IN_REVIEW: 'warning', CHANGES_REQUESTED: 'danger', APPROVED: 'success', SCHEDULED: 'info', PUBLISHED: 'primary' } satisfies Record<ContentStatus, BadgeTone>,
  client: { ONBOARDING: 'info', ACTIVE: 'success', PAUSED: 'warning', CHURNED: 'danger' } satisfies Record<ClientStatus, BadgeTone>,
  project: { PLANNING: 'neutral', ACTIVE: 'success', ON_HOLD: 'warning', COMPLETED: 'primary' } satisfies Record<ProjectStatus, BadgeTone>,
  invoice: { DRAFT: 'neutral', SENT: 'info', PAID: 'success', OVERDUE: 'danger', VOID: 'neutral' } satisfies Record<InvoiceStatus, BadgeTone>,
  lead: { NEW: 'neutral', CONTACTED: 'info', PROPOSAL: 'violet', NEGOTIATION: 'warning', WON: 'success', LOST: 'danger' } satisfies Record<LeadStatus, BadgeTone>,
  sentiment: { positive: 'success', neutral: 'neutral', negative: 'danger' } satisfies Record<SentimentValue, BadgeTone>,
} as const;

type Kinds = typeof TONES;

export type StatusKind = keyof Kinds;

export function statusTone<K extends StatusKind>(kind: K, value: keyof Kinds[K]): BadgeTone {
  return TONES[kind][value] as BadgeTone;
}

export function statusLabel<K extends StatusKind>(kind: K, value: keyof Kinds[K]): string {
  return t(`status.${kind}.${String(value)}` as MessageKey);
}

export function StatusBadge<K extends StatusKind>({ kind, value, dot = true }: { kind: K; value: keyof Kinds[K]; dot?: boolean }) {
  return (
    <Badge tone={statusTone(kind, value)} dot={dot}>
      {statusLabel(kind, value)}
    </Badge>
  );
}

/** Raw CSS colour for a status — used by charts and kanban column accents. */
export const TONE_COLOR: Record<BadgeTone, string> = {
  neutral: 'var(--muted)',
  primary: 'var(--primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  violet: 'var(--color-violet)',
  pink: 'var(--color-pink)',
};
