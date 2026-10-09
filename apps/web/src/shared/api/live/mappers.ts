import 'server-only';
import {
  ArticleCategories,
  AutomationActions,
  AutomationTriggers,
  ContentStatuses,
  ContentTypes,
  LeadStages,
  Platforms,
  type ApiContentType,
  type ContentType,
  type Platform,
} from '@agency-os/contracts';
import type { AuditEntry } from '@/features/audit/data/audit.repository';
import type { Automation, AutomationRun } from '@/features/automations/data/automations.repository';
import type { Client, BrandKit } from '@/features/clients/data/clients.repository';
import type { Post, PostMedia } from '@/features/content/data/content.repository';
import type { InboxItem } from '@/features/inbox/data/inbox.repository';
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
import type { Workflow } from '@/features/workflows/data/workflows.repository';
import { MediaAssetStatuses, UserRoles } from '@agency-os/contracts';
import { assetKindFromMimeType } from '@/features/media/utils/asset-kind';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/features/team/config';
import { HEALTH_BASELINE } from '@/features/clients/config';
import { NOTIFICATION_EVENTS, NOTIFICATIONS_HREF } from '@/features/notifications/config';
import { t } from '@/shared/i18n/t';
import { defaultWorkspaceId } from './workspace';
import { hueFromId, iso, num, str } from './utils';

type Raw = Record<string, unknown>;

const MINUTES_PER_HOUR = 60;

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
    industry: str(raw, 'industry'),
    website: str(raw, 'website'),
    tier: str(raw, 'tier'),
    status: asStatus(raw.status, ['ACTIVE', 'ONBOARDING', 'PAUSED', 'CHURNED'] as const, 'ONBOARDING'),
    color: `hsl(${hueFromId(id)} 70% 45%)`,
    contactName: primaryContact ? str(primaryContact, 'name') : str(raw, 'contactName'),
    contactEmail: primaryContact ? str(primaryContact, 'email') : str(raw, 'contactEmail'),
    health: HEALTH_BASELINE,
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
    type: str(raw, 'type'),
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
  const assigneeUserIds = Array.isArray(raw.assigneeUserIds) ? raw.assigneeUserIds : [];
  const firstAssignee = assigneeUserIds.find((id): id is string => typeof id === 'string');
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
    assigneeId: firstAssignee,
    dueDate: raw.dueDate ? iso(raw, 'dueDate') : undefined,
    estimateHours: typeof raw.estimateMinutes === 'number' ? raw.estimateMinutes / MINUTES_PER_HOUR : undefined,
    createdAt: iso(raw, 'createdAt'),
  };
}

function taskFieldsToApi(input: Partial<Task>): Raw {
  const body: Raw = {};
  if (input.projectId) body.projectId = input.projectId;
  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.priority) body.priority = input.priority;
  if (input.dueDate) body.dueDate = input.dueDate;
  if (input.estimateHours !== undefined) body.estimateMinutes = Math.round(input.estimateHours * MINUTES_PER_HOUR);
  return body;
}

export function taskToApi(input: Partial<Task>): Raw {
  const body = taskFieldsToApi(input);
  if (input.status) body.status = input.status;
  if (input.assigneeId) body.assigneeUserId = input.assigneeId;
  return body;
}

/** Status changes go through the transition endpoint, so PATCH carries only editable fields. */
export function taskPatchToApi(patch: Partial<Task>): Raw {
  const body = taskFieldsToApi(patch);
  if ('assigneeId' in patch) body.assigneeUserId = patch.assigneeId ?? null;
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
    company: str(raw, 'companyName'),
    contact: str(raw, 'contactName'),
    email: str(raw, 'contactEmail'),
    industry: str(raw, 'industry'),
    website: str(raw, 'website') || undefined,
    source: str(raw, 'source'),
    stage: asStatus(raw.stage, LeadStages, 'NEW'),
    valueMinor: num(raw, 'valueMinor'),
    ownerId: str(raw, 'ownerId'),
    nextStep: str(raw, 'nextStep'),
    nextStepAt: raw.nextStepAt ? iso(raw, 'nextStepAt') : undefined,
    convertedClientId: raw.convertedClientId ? str(raw, 'convertedClientId') : undefined,
    createdAt: iso(raw, 'createdAt'),
  };
}

/** Text fields are sent as-is so an empty string clears them on update. */
export function leadToApi(input: Partial<Lead>): Raw {
  const body: Raw = {};
  if (input.company) body.companyName = input.company;
  if (input.industry !== undefined) body.industry = input.industry;
  if (input.website !== undefined) body.website = input.website;
  if (input.source !== undefined) body.source = input.source;
  if (input.valueMinor !== undefined) body.valueMinor = input.valueMinor;
  if (input.contact !== undefined) body.contactName = input.contact;
  if (input.email !== undefined) body.contactEmail = input.email;
  if (input.nextStep !== undefined) body.nextStep = input.nextStep;
  if ('nextStepAt' in input) body.nextStepAt = input.nextStepAt ?? '';
  if (input.stage) body.stage = input.stage;
  if (input.ownerId) body.ownerId = input.ownerId;
  if (input.convertedClientId) body.convertedClientId = input.convertedClientId;
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
    taxRate: num(raw, 'taxRate'),
    lines,
  };
}

function invoiceLineFromApi(raw: Raw): InvoiceLine {
  return {
    description: str(raw, 'description'),
    quantity: num(raw, 'quantity'),
    unitMinor: num(raw, 'unitMinor'),
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
  const event = NOTIFICATION_EVENTS[str(raw, 'typeKey')];
  return {
    id: str(raw, 'id'),
    userId,
    kind: event?.kind ?? 'system',
    title: event ? t(event.title) : str(raw, 'title'),
    body: str(raw, 'body'),
    href: event?.href ?? NOTIFICATIONS_HREF,
    read: Boolean(raw.readAt),
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
    author: str(raw, 'authorName') || str(raw, 'handle'),
    handle: str(raw, 'handle'),
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
    title: str(raw, 'title'),
    category: asStatus(raw.category, ArticleCategories, ArticleCategories[0]),
    body: str(raw, 'body'),
    authorId: str(raw, 'authorId'),
    updatedAt: iso(raw, 'updatedAt'),
  };
}

export function articleToApi(input: Partial<Article>): Raw {
  const body: Raw = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.category) body.category = input.category;
  if (input.body !== undefined) body.body = input.body;
  return body;
}

export function automationFromApi(raw: Raw): Automation {
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    trigger: asStatus(raw.trigger, AutomationTriggers, 'content.submitted'),
    action: asStatus(raw.action, AutomationActions, 'notify.team'),
    enabled: raw.enabled === true,
    runs: num(raw, 'runs'),
    failures: num(raw, 'failures'),
    lastRunAt: raw.lastRunAt ? iso(raw, 'lastRunAt') : undefined,
    createdAt: iso(raw, 'createdAt'),
  };
}

export function workflowFromApi(raw: Raw): Workflow {
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    stages: Array.isArray(raw.stages) ? raw.stages.filter((s): s is string => typeof s === 'string') : [],
    requiresClientApproval: raw.requiresClientApproval === true,
    slaHours: num(raw, 'slaHours'),
    active: raw.active === true,
  };
}

export function workflowToApi(input: Partial<Workflow>): Raw {
  return {
    name: input.name,
    stages: input.stages,
    slaHours: input.slaHours,
    requiresClientApproval: input.requiresClientApproval,
    active: input.active,
  };
}

export function automationToApi(input: Partial<Automation>): Raw {
  return { name: input.name, trigger: input.trigger, action: input.action, enabled: input.enabled };
}

const FAILED_RUN_STATUS = 'FAILED';

export function automationRunFromApi(raw: Raw): AutomationRun {
  return {
    id: str(raw, 'id'),
    automationId: str(raw, 'automationId'),
    at: iso(raw, 'createdAt'),
    ok: str(raw, 'status') !== FAILED_RUN_STATUS,
    detail: str(raw, 'detail') || str(raw, 'automationName'),
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
    capacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
    skills: [],
    status: str(raw, 'status') === 'PENDING' ? 'INVITED' : 'ACTIVE',
    joinedAt: iso(raw, 'createdAt'),
  };
}

export function timeEntryFromApi(raw: Raw): TimeEntry {
  return {
    id: str(raw, 'id'),
    userId: str(raw, 'userId'),
    projectId: str(raw, 'projectId'),
    clientId: str(raw, 'clientId'),
    taskId: raw.taskId ? str(raw, 'taskId') : undefined,
    minutes: num(raw, 'minutes'),
    date: iso(raw, 'startedAt').slice(0, 10),
    note: str(raw, 'note'),
    billable: raw.billable === true,
  };
}

/** The API records the entry against the caller's own membership, so `userId` is not sent. */
export function timeEntryToApi(input: Partial<TimeEntry>): Raw {
  const body: Raw = { minutes: input.minutes, date: input.date };
  if (input.projectId) body.projectId = input.projectId;
  if (input.clientId) body.clientId = input.clientId;
  if (input.taskId) body.taskId = input.taskId;
  if (input.note) body.note = input.note;
  if (input.billable !== undefined) body.billable = input.billable;
  return body;
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
