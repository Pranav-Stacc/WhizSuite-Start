import 'server-only';
import {
  AutomationActions,
  AutomationTriggers,
  ContentStatuses,
  ContentTypes,
  Platforms,
  type ApiContentType,
  type ContentType,
  type Platform,
} from '@agency-os/contracts';
import type { AuditEntry } from '@/features/audit/data/audit.repository';
import type { Automation } from '@/features/automations/data/automations.repository';
import type { Client, BrandKit } from '@/features/clients/data/clients.repository';
import type { Post, PostMedia } from '@/features/content/data/content.repository';
import type { InboxItem } from '@/features/inbox/data/inbox.repository';
import type { Integration } from '@/features/integrations/data/integrations.repository';
import type { Invoice, InvoiceLine } from '@/features/invoices/data/invoices.repository';
import type { Article } from '@/features/knowledge/data/knowledge.repository';
import type { Lead } from '@/features/leads/data/leads.repository';
import type { Asset } from '@/features/media/data/media.repository';
import type { Department } from '@/features/departments/data/departments.repository';
import type { AgencyRole } from '@/features/roles/data/roles.repository';
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

const EMPTY_BRAND: BrandKit = { primary: '#ffffff', secondary: '#d1d1d1', accent: '#8D9B98', voice: '', hashtags: [], pillars: [] };

const CONTENT_TYPE_TO_API: Record<ContentType, ApiContentType> = {
  POST: 'STATIC_POST',
  REEL: 'REEL',
  STORY: 'STORY',
  CAROUSEL: 'CAROUSEL',
  VIDEO: 'VIDEO',
  ARTICLE: 'ARTICLE',
};

const CONTENT_TYPE_FROM_API: Record<string, ContentType> = Object.fromEntries(
  Object.entries(CONTENT_TYPE_TO_API).map(([web, api]) => [api, web as ContentType]),
);

function brandFromKit(kit: Raw | undefined): BrandKit {
  if (!kit) return EMPTY_BRAND;
  const colors = (kit.colors ?? kit) as Raw;
  const voiceTone = (kit.voiceTone ?? kit) as Raw;
  const hashtagSets = kit.hashtagSets as Raw | undefined;
  const contentPillars = kit.contentPillars as Raw | undefined;
  const tags = hashtagSets && typeof hashtagSets === 'object' ? Object.values(hashtagSets).flat() : [];
  const pillars = contentPillars && typeof contentPillars === 'object' ? Object.values(contentPillars).flat() : [];
  return {
    primary: str(colors, 'primary', EMPTY_BRAND.primary),
    secondary: str(colors, 'secondary', EMPTY_BRAND.secondary),
    accent: str(colors, 'accent', EMPTY_BRAND.accent),
    voice: str(voiceTone, 'voice') || str(kit, 'voice'),
    hashtags: Array.isArray(kit.hashtags) ? (kit.hashtags as string[]) : tags.filter((t): t is string => typeof t === 'string'),
    pillars: Array.isArray(kit.pillars) ? (kit.pillars as string[]) : pillars.filter((p): p is string => typeof p === 'string'),
  };
}

function asStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.some((v) => v === value) ? (value as T) : fallback;
}

export function clientFromApi(raw: Raw): Client {
  const id = str(raw, 'id');
  const kit = (raw.brandKit ?? raw.brand) as Raw | undefined;
  const contacts = Array.isArray(raw.contacts) ? (raw.contacts as Raw[]) : [];
  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const retainers = Array.isArray(raw.retainers) ? (raw.retainers as Raw[]) : [];
  const retainerMinor = retainers.reduce((sum, r) => sum + num(r, 'amountMinor'), 0);
  return {
    id,
    name: str(raw, 'displayName') || str(raw, 'name'),
    industry: str(raw, 'industry', 'General'),
    website: str(raw, 'website'),
    tier: str(raw, 'tier', 'Standard'),
    status: asStatus(raw.status, ['ACTIVE', 'ONBOARDING', 'PAUSED', 'CHURNED'] as const, 'ONBOARDING'),
    color: `hsl(${hueFromId(id)} 70% 45%)`,
    contactName: primaryContact ? str(primaryContact, 'name') : str(raw, 'contactName'),
    contactEmail: primaryContact ? str(primaryContact, 'email') : str(raw, 'contactEmail'),
    health: retainerMinor > 0 ? 85 : 70,
    retainerMinor,
    platforms: [],
    since: iso(raw, 'createdAt'),
    ownerId: str(raw, 'ownerId') || str(raw, 'createdById'),
    brand: brandFromKit(kit),
  };
}

export async function clientToApi(input: Partial<Client>): Promise<Raw> {
  const workspaceId = await defaultWorkspaceId();
  if (!workspaceId) throw new Error('No workspace configured for this organization');
  const body: Raw = { workspaceId, displayName: input.name ?? '' };
  if (input.industry) body.industry = input.industry;
  if (input.website) body.website = input.website;
  return body;
}

export function clientBrandKitToApi(input: Partial<Client>): Raw {
  const brand = input.brand;
  if (!brand) return {};
  return {
    colors: { primary: brand.primary, secondary: brand.secondary, accent: brand.accent },
    voiceTone: { voice: brand.voice },
    hashtagSets: brand.hashtags.length ? { default: brand.hashtags } : undefined,
    contentPillars: brand.pillars.length ? { default: brand.pillars } : undefined,
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
  if (!workspaceId) throw new Error('No workspace configured for this organization');
  const body: Raw = { workspaceId, clientId: input.clientId, name: input.name ?? '' };
  if (input.type) body.type = input.type;
  if (input.status) body.status = input.status;
  return body;
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
  const body: Raw = { projectId: input.projectId, title: input.title ?? '' };
  if (input.description) body.description = input.description;
  if (input.priority) body.priority = input.priority;
  if (input.dueDate) body.dueDate = input.dueDate;
  return body;
}

function postMediaFromApi(raw: unknown): PostMedia[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Raw[]).map((m) => ({
    assetId: str(m, 'assetId'),
    name: str(m, 'name'),
    mimeType: str(m, 'mimeType'),
    url: typeof m.url === 'string' ? m.url : undefined,
  }));
}

export function contentFromApi(raw: Raw): Post {
  const platforms = Array.isArray(raw.platforms) ? (raw.platforms as Platform[]) : [];
  return {
    id: str(raw, 'id'),
    clientId: str(raw, 'clientId'),
    title: str(raw, 'title'),
    caption: str(raw, 'caption'),
    contentType: CONTENT_TYPE_FROM_API[String(raw.contentType)] ?? asStatus(raw.contentType, ContentTypes, 'POST'),
    platforms,
    status: asStatus(raw.status, ContentStatuses, 'DRAFT'),
    scheduledAt: raw.scheduledAt ? iso(raw, 'scheduledAt') : undefined,
    authorId: str(raw, 'createdById'),
    hashtags: Array.isArray(raw.hashtags) ? (raw.hashtags as string[]) : [],
    ctaUrl: str(raw, 'ctaUrl') || undefined,
    pillar: str(raw, 'pillar') || undefined,
    gridPosition: typeof raw.gridPosition === 'number' ? raw.gridPosition : undefined,
    media: postMediaFromApi(raw.media),
    createdAt: iso(raw, 'createdAt'),
    updatedAt: iso(raw, 'updatedAt'),
    version: num(raw, 'version', 1),
  };
}

/** Editable fields shared by create and PATCH; `clear` sends null for keys explicitly set to undefined. */
function contentFieldsToApi(input: Partial<Post>, clear: boolean): Raw {
  const body: Raw = {};
  const nullable = (key: keyof Post, value: unknown) => {
    if (value !== undefined && value !== '') body[key] = value;
    else if (clear && key in input) body[key] = null;
  };
  if (input.title !== undefined) body.title = input.title;
  if (input.contentType) body.contentType = CONTENT_TYPE_TO_API[input.contentType];
  if (input.platforms) body.platforms = input.platforms;
  if (input.hashtags) body.hashtags = input.hashtags;
  if (input.media) body.mediaAssetIds = input.media.map((m) => m.assetId);
  nullable('caption', input.caption);
  nullable('pillar', input.pillar);
  nullable('ctaUrl', input.ctaUrl);
  nullable('scheduledAt', input.scheduledAt);
  return body;
}

export function contentToApi(input: Partial<Post>): Raw {
  const body = contentFieldsToApi(input, false);
  body.clientId = input.clientId;
  body.title = input.title ?? '';
  body.contentType ??= CONTENT_TYPE_TO_API.POST;
  if (input.status === 'IN_REVIEW') body.status = input.status;
  return body;
}

export function contentPatchToApi(patch: Partial<Post>): Raw {
  return contentFieldsToApi(patch, true);
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
  const body: Raw = { companyName: input.company, brandName: input.company };
  if (input.industry) body.industry = input.industry;
  if (input.source) body.source = input.source;
  if (input.valueMinor) body.valueMinor = input.valueMinor;
  if (input.contact) body.contactName = input.contact;
  if (input.email) body.contactEmail = input.email;
  return body;
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
    uploadedBy: str(raw, 'createdById'),
    createdAt: iso(raw, 'createdAt'),
    url: str(raw, 'previewUrl') || undefined,
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

export function roleFromApi(raw: Raw): AgencyRole {
  const permissions = Array.isArray(raw.permissions) ? (raw.permissions as Raw[]) : [];
  const keys = permissions
    .map((row) => {
      const perm = (row.permission ?? row) as Raw;
      return str(perm, 'key');
    })
    .filter(Boolean);
  const assignments = Array.isArray(raw.assignments) ? raw.assignments : [];
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    description: str(raw, 'description'),
    isSystem: Boolean(raw.isSystem),
    permissionKeys: keys,
    memberCount: assignments.length,
  };
}

export function roleToApi(input: Partial<AgencyRole>): Raw {
  return {
    name: input.name,
    description: input.description,
    permissionKeys: input.permissionKeys ?? [],
  };
}

export function departmentFromApi(raw: Raw): Department {
  const designations = Array.isArray(raw.designations) ? raw.designations : [];
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    path: str(raw, 'path'),
    parentId: raw.parentId ? str(raw, 'parentId') : undefined,
    headcount: designations.length,
    createdAt: iso(raw, 'createdAt'),
  };
}

export function departmentToApi(input: Partial<Department>): Raw {
  const body: Raw = { name: input.name ?? '' };
  if (input.parentId) body.parentId = input.parentId;
  return body;
}
