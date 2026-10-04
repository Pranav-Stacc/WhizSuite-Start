import 'server-only';
import {
  AutomationActions,
  AutomationTriggers,
  Platforms,
  type Platform,
} from '@agency-os/contracts';
import type { AuditEntry } from '@/features/audit/data/audit.repository';
import type { Automation } from '@/features/automations/data/automations.repository';
import type { Client, BrandKit } from '@/features/clients/data/clients.repository';
import type { Post } from '@/features/content/data/content.repository';
import type { InboxItem } from '@/features/inbox/data/inbox.repository';
import type { Integration } from '@/features/integrations/data/integrations.repository';
import type { Invoice, InvoiceLine } from '@/features/invoices/data/invoices.repository';
import type { Article } from '@/features/knowledge/data/knowledge.repository';
import type { Lead } from '@/features/leads/data/leads.repository';
import type { Asset } from '@/features/media/data/media.repository';
import type { Member, MemberRole } from '@/features/team/data/members.repository';
import type { Notification } from '@/features/notifications/data/notifications.repository';
import type { Project } from '@/features/projects/data/projects.repository';
import type { Task } from '@/features/tasks/data/tasks.repository';
import type { TimeEntry } from '@/features/time/data/time.repository';
import { MediaAssetStatuses, UserRoles } from '@agency-os/contracts';
import { assetKindFromMimeType } from '@/features/media/utils/asset-kind';
import { defaultWorkspaceId } from './workspace';
import { hueFromId, iso, num, str } from './utils';

type Raw = Record<string, unknown>;

const EMPTY_BRAND: BrandKit = { primary: '#00FF66', secondary: '#18E889', accent: '#F59E0B', voice: '', hashtags: [], pillars: [] };

function asStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.some((v) => v === value) ? (value as T) : fallback;
}

export function clientFromApi(raw: Raw): Client {
  const id = str(raw, 'id');
  const kit = (raw.brandKit ?? raw.brand) as Raw | undefined;
  return {
    id,
    name: str(raw, 'displayName') || str(raw, 'name'),
    industry: str(raw, 'industry', 'General'),
    website: str(raw, 'website'),
    tier: str(raw, 'tier', 'Standard'),
    status: asStatus(raw.status, ['ACTIVE', 'ONBOARDING', 'PAUSED', 'CHURNED'] as const, 'ONBOARDING'),
    color: `hsl(${hueFromId(id)} 70% 45%)`,
    contactName: str(raw, 'contactName'),
    contactEmail: str(raw, 'contactEmail'),
    health: 80,
    retainerMinor: 0,
    platforms: [],
    since: iso(raw, 'createdAt'),
    ownerId: str(raw, 'createdById'),
    brand: kit
      ? {
          primary: str(kit, 'primary', EMPTY_BRAND.primary),
          secondary: str(kit, 'secondary', EMPTY_BRAND.secondary),
          accent: str(kit, 'accent', EMPTY_BRAND.accent),
          voice: str(kit, 'voice'),
          hashtags: Array.isArray(kit.hashtags) ? (kit.hashtags as string[]) : [],
          pillars: Array.isArray(kit.pillars) ? (kit.pillars as string[]) : [],
        }
      : EMPTY_BRAND,
  };
}

export async function clientToApi(input: Partial<Client>): Promise<Raw> {
  const workspaceId = await defaultWorkspaceId();
  return {
    workspaceId,
    displayName: input.name,
    industry: input.industry,
    website: input.website,
    tier: input.tier,
    status: input.status,
  };
}

export function projectFromApi(raw: Raw): Project {
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    name: str(raw, 'name'),
    type: str(raw, 'type', 'Retainer'),
    status: (() => {
      const api = String(raw.status ?? 'ACTIVE');
      if (api === 'CANCELLED') return 'ON_HOLD';
      return asStatus(api, ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const, 'ACTIVE');
    })(),
    startDate: raw.startDate ? iso(raw, 'startDate') : iso(raw, 'createdAt'),
    endDate: raw.endDate ? iso(raw, 'endDate') : undefined,
    budgetMinor: num(raw, 'budgetMinor'),
    ownerId: str(raw, 'createdById'),
  };
}

export async function projectToApi(input: Partial<Project>): Promise<Raw> {
  const workspaceId = await defaultWorkspaceId();
  return { workspaceId, clientId: input.clientId, name: input.name, type: input.type, status: input.status };
}

export function taskFromApi(raw: Raw): Task {
  const assignees = Array.isArray(raw.assignees) ? raw.assignees : [];
  const firstAssignee = assignees[0] as Raw | undefined;
  return {
    id: str(raw, 'id'),
    projectId: str(raw, 'projectId'),
    clientId: str(raw, 'clientId'),
    title: str(raw, 'title'),
    description: str(raw, 'description'),
    status: (() => {
      const api = String(raw.status ?? 'TODO');
      if (api === 'BLOCKED') return 'IN_PROGRESS';
      return asStatus(api, ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const, 'TODO');
    })(),
    priority: asStatus(raw.priority, ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const, 'MEDIUM'),
    assigneeId: firstAssignee ? str(firstAssignee, 'membershipId') || str(firstAssignee, 'userId') : undefined,
    dueDate: raw.dueDate ? iso(raw, 'dueDate') : undefined,
    estimateHours: Math.max(1, Math.round(num(raw, 'estimateMinutes', 120) / 60)),
    createdAt: iso(raw, 'createdAt'),
  };
}

export function taskToApi(input: Partial<Task>): Raw {
  return {
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    estimateMinutes: input.estimateHours ? input.estimateHours * 60 : undefined,
  };
}

export function contentFromApi(raw: Raw): Post {
  const platforms = Array.isArray(raw.platforms) ? (raw.platforms as Platform[]) : [];
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    title: str(raw, 'title'),
    caption: str(raw, 'caption'),
    contentType: asStatus(raw.contentType, ['POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO'] as const, 'POST'),
    platforms,
    status: asStatus(raw.status, ['DRAFT', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'SCHEDULED', 'PUBLISHED'] as const, 'DRAFT'),
    scheduledAt: raw.scheduledAt ? iso(raw, 'scheduledAt') : undefined,
    authorId: str(raw, 'createdById'),
    hashtags: Array.isArray(raw.hashtags) ? (raw.hashtags as string[]) : [],
    createdAt: iso(raw, 'createdAt'),
    updatedAt: iso(raw, 'updatedAt'),
    version: num(raw, 'version', 1),
  };
}

export function contentToApi(input: Partial<Post>): Raw {
  return {
    clientId: input.clientId,
    title: input.title,
    caption: input.caption,
    contentType: input.contentType,
    status: input.status,
  };
}

export function leadFromApi(raw: Raw): Lead {
  return {
    id: str(raw, 'id'),
    company: str(raw, 'companyName') || str(raw, 'brandName') || 'Prospect',
    contact: str(raw, 'contactName'),
    email: str(raw, 'contactEmail'),
    industry: str(raw, 'industry', ''),
    source: str(raw, 'source', 'Inbound'),
    stage: asStatus(raw.stage, ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const, 'NEW'),
    valueMinor: num(raw, 'valueMinor'),
    ownerId: str(raw, 'ownerId'),
    nextStep: str(raw, 'nextStep'),
    nextStepAt: raw.nextStepAt ? iso(raw, 'nextStepAt') : undefined,
    convertedClientId: raw.convertedClientId ? str(raw, 'convertedClientId') : undefined,
    createdAt: iso(raw, 'createdAt'),
  };
}

export function leadToApi(input: Partial<Lead>): Raw {
  return {
    companyName: input.company,
    brandName: input.company,
    industry: input.industry,
    source: input.source,
    stage: input.stage,
    valueMinor: input.valueMinor,
  };
}

export function invoiceFromApi(raw: Raw): Invoice {
  const lines = Array.isArray(raw.lines) ? (raw.lines as Raw[]).map(invoiceLineFromApi) : [];
  return {
    id: str(raw, 'id'),
    number: str(raw, 'number'),
    clientId: str(raw, 'clientId'),
    status: asStatus(raw.status, ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'] as const, 'DRAFT'),
    issueDate: iso(raw, 'issueDate') || iso(raw, 'createdAt'),
    dueDate: iso(raw, 'dueDate'),
    paidAt: raw.paidAt ? iso(raw, 'paidAt') : undefined,
    taxRate: num(raw, 'taxRate', 18),
    lines,
  };
}

function invoiceLineFromApi(raw: Raw): InvoiceLine {
  return {
    description: str(raw, 'description'),
    quantity: num(raw, 'quantity', 1),
    unitMinor: num(raw, 'unitMinor') || num(raw, 'unitPriceMinor') || num(raw, 'amountMinor'),
  };
}

export function invoiceToApi(input: Partial<Invoice>): Raw {
  return {
    clientId: input.clientId,
    number: input.number,
    status: input.status,
    dueDate: input.dueDate,
    taxRate: input.taxRate,
    lines: input.lines,
  };
}

export function notificationFromApi(raw: Raw, userId: string): Notification {
  return {
    id: str(raw, 'id'),
    userId,
    kind: asStatus(raw.kind, ['approval', 'task', 'mention', 'invoice', 'system', 'lead'] as const, 'system'),
    title: str(raw, 'title'),
    body: str(raw, 'body') || str(raw, 'message'),
    href: str(raw, 'href', '/dashboard'),
    read: Boolean(raw.read ?? raw.readAt),
    at: iso(raw, 'createdAt'),
  };
}

export function auditFromApi(raw: Raw): AuditEntry {
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Raw) : {};
  const actorType = String(raw.actorType ?? '').toLowerCase();
  const outcome = String(raw.outcome ?? '').toLowerCase();
  return {
    id: str(raw, 'id'),
    at: iso(raw, 'createdAt') || iso(raw, 'at'),
    actorId: str(raw, 'actorId', 'system'),
    actorName: str(metadata, 'actorName') || str(raw, 'actorName', actorType === 'system' ? 'System' : 'User'),
    actorType: actorType === 'system' ? 'system' : 'user',
    action: str(raw, 'action'),
    entityType: str(raw, 'entityType'),
    entityId: str(raw, 'entityId'),
    entityLabel: str(metadata, 'entityLabel') || str(raw, 'entityLabel') || str(raw, 'entityId', '—'),
    summary: str(metadata, 'summary') || str(raw, 'summary') || str(raw, 'action'),
    outcome: outcome === 'failure' || outcome === 'failed' ? 'failure' : 'success',
    ip: str(raw, 'ipAddress') || str(raw, 'ip', '—'),
    correlationId: str(raw, 'correlationId'),
  };
}

export function integrationFromApi(raw: Raw): Integration {
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    platform: asStatus(raw.platform, Platforms, 'instagram'),
    handle: str(raw, 'handle') || str(raw, 'name'),
    connected: str(raw, 'status') === 'CONNECTED' || raw.connected === true,
    followers: num(raw, 'followers'),
    lastSyncAt: raw.lastSyncAt ? iso(raw, 'lastSyncAt') : undefined,
  };
}

export function assetFromApi(raw: Raw): Asset {
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    name: str(raw, 'name'),
    kind: assetKindFromMimeType(str(raw, 'mimeType')),
    mimeType: str(raw, 'mimeType'),
    status: asStatus(raw.status, MediaAssetStatuses, 'PENDING_UPLOAD'),
    sizeKb: Math.round(num(raw, 'sizeBytes', 0) / 1024),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    hue: hueFromId(str(raw, 'id')),
    uploadedBy: str(raw, 'createdById'),
    createdAt: iso(raw, 'createdAt'),
  };
}

export function inboxFromApi(raw: Raw): InboxItem {
  const type = str(raw, 'type').toLowerCase();
  const kind = type === 'comment' || type === 'dm' || type === 'mention' ? type : 'dm';
  const statusRaw = str(raw, 'status').toLowerCase();
  const status = statusRaw === 'replied' || statusRaw === 'archived' ? statusRaw : 'open';
  const sentimentRaw = str(raw, 'sentiment').toLowerCase();
  const sentiment = sentimentRaw === 'positive' || sentimentRaw === 'negative' ? sentimentRaw : 'neutral';
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    kind,
    platform: asStatus(raw.platform, Platforms, 'instagram'),
    author: str(raw, 'authorName', 'Unknown'),
    handle: str(raw, 'handle', '@user'),
    body: str(raw, 'preview') || str(raw, 'lastMessage') || str(raw, 'body'),
    status,
    sentiment,
    assigneeId: raw.assigneeId ? str(raw, 'assigneeId') : undefined,
    receivedAt: iso(raw, 'updatedAt') || iso(raw, 'createdAt'),
  };
}

export function articleFromApi(raw: Raw): Article {
  return {
    id: str(raw, 'id'),
    title: str(raw, 'name') || str(raw, 'title'),
    category: 'SOP',
    body: str(raw, 'description') || str(raw, 'body', ''),
    authorId: str(raw, 'createdById'),
    updatedAt: iso(raw, 'updatedAt'),
  };
}

export function automationFromApi(raw: Raw): Automation {
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    trigger: asStatus(raw.trigger, AutomationTriggers, 'content.submitted'),
    action: asStatus(raw.action, AutomationActions, 'notify.team'),
    enabled: str(raw, 'status') === 'PUBLISHED' || raw.enabled === true,
    runs: num(raw, 'runs'),
    failures: num(raw, 'failures'),
    lastRunAt: raw.lastRunAt ? iso(raw, 'lastRunAt') : undefined,
    createdAt: iso(raw, 'createdAt'),
  };
}

export function memberFromApi(raw: Raw): Member {
  const role = asStatus(raw.membershipType, ['OWNER', 'ADMIN', 'MEMBER', 'CLIENT'] as const, 'MEMBER');
  const mapped: MemberRole = role === 'OWNER' ? UserRoles.OWNER : role === 'ADMIN' ? UserRoles.MANAGER : UserRoles.CREATOR;
  return {
    id: str(raw, 'id') || str(raw, 'membershipId'),
    name: str(raw, 'name') || str(raw, 'email'),
    email: str(raw, 'email'),
    role: mapped,
    title: str(raw, 'title'),
    capacityHours: 40,
    skills: [],
    status: str(raw, 'status') === 'PENDING' ? 'INVITED' : 'ACTIVE',
    joinedAt: iso(raw, 'createdAt'),
  };
}

export function timeEntryFromApi(raw: Raw): TimeEntry {
  return {
    id: str(raw, 'id'),
    userId: str(raw, 'membershipId'),
    projectId: str(raw, 'projectId'),
    clientId: str(raw, 'clientId'),
    taskId: raw.taskId ? str(raw, 'taskId') : undefined,
    minutes: num(raw, 'minutes'),
    date: iso(raw, 'startedAt').slice(0, 10),
    note: str(raw, 'note'),
    billable: raw.billable !== false,
  };
}
