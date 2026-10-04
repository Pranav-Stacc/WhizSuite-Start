import 'server-only';
import { auditLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export type AuditOutcome = 'success' | 'failure';

export interface AuditEntry extends Entity {
  at: string;
  actorId: string;
  actorName: string;
  actorType: 'user' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  outcome: AuditOutcome;
  ip: string;
  correlationId: string;
  diff?: Record<string, { from?: string; to?: string }>;
}

const minutesAgo = (m: number): string => new Date(Date.now() - m * 60_000).toISOString();

const SEEDS: Array<Omit<AuditEntry, 'id' | 'correlationId' | 'ip'>> = [
  { at: minutesAgo(8), actorId: 'm-kabir', actorName: 'Kabir Shah', actorType: 'user', action: 'task.status_changed', entityType: 'task', entityId: 't3', entityLabel: 'Winter blend hero reel — rough cut', summary: 'Moved task to In review', outcome: 'success', diff: { status: { from: 'IN_PROGRESS', to: 'IN_REVIEW' } } },
  { at: minutesAgo(34), actorId: 'm-priya', actorName: 'Priya Nair', actorType: 'user', action: 'content.approved', entityType: 'content', entityId: 'c4', entityLabel: 'Nimbus 3.0 is live', summary: 'Approved content on behalf of the client', outcome: 'success', diff: { status: { from: 'IN_REVIEW', to: 'APPROVED' } } },
  { at: minutesAgo(70), actorId: 'system', actorName: 'Automation engine', actorType: 'system', action: 'automation.executed', entityType: 'automation', entityId: 'au1', entityLabel: 'Notify client when content is ready', summary: 'Sent approval request email to Neha Kapoor', outcome: 'success' },
  { at: minutesAgo(130), actorId: 'm-aarav', actorName: 'Aarav Mehta', actorType: 'user', action: 'invoice.sent', entityType: 'invoice', entityId: 'inv3', entityLabel: 'INV-2026-0003', summary: 'Sent invoice to Nimbus Cloud', outcome: 'success' },
  { at: minutesAgo(190), actorId: 'm-aarav', actorName: 'Aarav Mehta', actorType: 'user', action: 'auth.login', entityType: 'session', entityId: 'sess-1', entityLabel: 'owner@pixelforge.agency', summary: 'Signed in', outcome: 'success' },
  { at: minutesAgo(240), actorId: 'unknown', actorName: 'Unknown', actorType: 'user', action: 'auth.login_failed', entityType: 'session', entityId: 'n/a', entityLabel: 'admin@pixelforge.agency', summary: 'Failed sign-in attempt (wrong password)', outcome: 'failure' },
  { at: daysFromNow(-1, 11), actorId: 'm-priya', actorName: 'Priya Nair', actorType: 'user', action: 'client.updated', entityType: 'client', entityId: 'cl-verde', entityLabel: 'Verde Skincare', summary: 'Updated brand kit', outcome: 'success', diff: { voice: { from: 'Calm, clinical', to: 'Calm, science-backed, reassuring.' } } },
  { at: daysFromNow(-1, 15), actorId: 'm-aarav', actorName: 'Aarav Mehta', actorType: 'user', action: 'member.role_changed', entityType: 'member', entityId: 'm-meera', entityLabel: 'Meera Joshi', summary: 'Changed role to Creator', outcome: 'success', diff: { role: { from: 'manager', to: 'creator' } } },
  { at: daysFromNow(-2, 9), actorId: 'system', actorName: 'Publishing worker', actorType: 'system', action: 'content.published', entityType: 'content', entityId: 'c9', entityLabel: 'Sunday latte art challenge', summary: 'Published to Instagram and Facebook', outcome: 'success' },
  { at: daysFromNow(-3, 13), actorId: 'm-aarav', actorName: 'Aarav Mehta', actorType: 'user', action: 'export.generated', entityType: 'report', entityId: 'rep-1', entityLabel: 'Performance report (30 days)', summary: 'Exported CSV report', outcome: 'success' },
];

export const auditRepository = createRepository<AuditEntry>('audit', () =>
  SEEDS.map((entry, index) => ({ ...entry, id: `aud-${index + 1}`, ip: '10.0.0.' + (10 + index), correlationId: `corr-${(1000 + index * 37).toString(16)}` })),
  auditLive,
);
