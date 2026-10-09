export const Visibilities = ['INTERNAL', 'CLIENT_VISIBLE'] as const;
export type Visibility = (typeof Visibilities)[number];

export const CalendarSourceTypes = [
  'MANUAL',
  'CONTENT',
  'TASK',
  'MEETING',
  'DEADLINE',
  'SHOOT',
  'APPROVAL',
  'CAMPAIGN',
  'INVOICE',
  'MILESTONE',
] as const;
export type CalendarSourceType = (typeof CalendarSourceTypes)[number];

/**
 * Unified calendar feed entry — stored projections (`calendar_items`) plus
 * live-federated dates from other domains (content, tasks, approvals, …).
 */
export type CalendarFeedItem = {
  id: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  clientId?: string | null;
  projectId?: string | null;
  status?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Default subfolders created under a shoot / client media root. */
export const DefaultShootFolderNames = ['Raw', 'Selects', 'Finals', 'Deliverables'] as const;

/** Default client library roots (agency-internal vs client-visible). */
export const DefaultClientFolderTemplate = [
  { name: 'Brand Assets', visibility: 'CLIENT_VISIBLE' as const },
  { name: 'Shoots', visibility: 'INTERNAL' as const },
  { name: 'Deliverables', visibility: 'CLIENT_VISIBLE' as const },
  { name: 'Agency', visibility: 'INTERNAL' as const },
] as const;

export const CustomFieldEntityTypes = ['client', 'project', 'task', 'content', 'lead'] as const;
export type CustomFieldEntityType = (typeof CustomFieldEntityTypes)[number];

export const CustomFieldTypes = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL'] as const;
export type CustomFieldType = (typeof CustomFieldTypes)[number];

export const ReportStatuses = ['DRAFT', 'READY', 'SENT'] as const;
export type ReportStatus = (typeof ReportStatuses)[number];

export const TemplateTypes = ['PROJECT', 'TASK', 'CONTENT', 'REPORT', 'MESSAGE'] as const;
export type TemplateType = (typeof TemplateTypes)[number];

export const TemplateScopes = ['ORGANIZATION', 'CLIENT'] as const;
export type TemplateScope = (typeof TemplateScopes)[number];

export const IntegrationConnectionStatuses = ['PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR'] as const;
export type IntegrationConnectionStatus = (typeof IntegrationConnectionStatuses)[number];

export const FeedbackThreadStatuses = ['OPEN', 'RESOLVED'] as const;
export type FeedbackThreadStatus = (typeof FeedbackThreadStatuses)[number];

/** How many named approvers must act before a step completes. */
export const ApprovalStepRules = ['ANY', 'ALL', 'QUORUM'] as const;
export type ApprovalStepRule = (typeof ApprovalStepRules)[number];

/**
 * Who may approve a step / workflow stage.
 * - `approverIds`: concrete user ids
 * - `roleIds`: roles whose holders (optionally scoped) are in the pool
 * - `scopeType` + `scopeResourceId`: narrow role holders (e.g. CLIENT + clientId)
 * - `quorumCount`: required when rule is QUORUM
 * - `resolvedUserIds`: filled at request time for enforcement + notifications
 */
export type ApproverSpec = {
  approverIds?: string[];
  roleIds?: string[];
  scopeType?: string;
  scopeResourceId?: string | null;
  quorumCount?: number;
  resolvedUserIds?: string[];
};

export const RESOURCE_NAME_MIN_LENGTH = 2;
export const RESOURCE_NAME_MAX_LENGTH = 200;
export const RESOURCE_KEY_MAX_LENGTH = 100;
export const RESOURCE_TEXT_MAX_LENGTH = 2000;
export const APPROVAL_STEPS_MAX = 10;
