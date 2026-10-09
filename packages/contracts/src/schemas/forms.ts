import { z } from 'zod';
import {
  ApprovalActions,
  AutomationActions,
  AutomationTriggers,
  ClientStatuses,
  ContentTypes,
  MembershipTypes,
  Platforms,
  PortalAccessModes,
  Priorities,
  ProjectStatuses,
  TaskStatuses,
} from '../domain/statuses.js';
import {
  CONTENT_CTA_URL_MAX_LENGTH,
  CONTENT_MEDIA_MAX_DEFAULT,
  CONTENT_PILLAR_MAX_LENGTH,
  normalizeHashtags,
} from '../content/content.js';
import {
  ApprovalStepRules,
  RESOURCE_NAME_MIN_LENGTH,
} from '../platform/resources.js';
import { MEMBER_ROLES_MAX } from '../auth/access.js';
import { AssignableScopeTypes } from '../auth/permissions.js';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const loginSchema = z.object({
  email: z.string().trim().email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const PASSWORD_MIN_LENGTH = 12;
export const ORGANIZATION_NAME_MIN_LENGTH = 2;
/** Source of the workspace slug rule; shared as a string so non-JS clients can compile it. */
export const ORGANIZATION_SLUG_PATTERN = '^[a-z0-9-]+$';

/** Google ID token from GIS / google_sign_in; optional org fields create a workspace for new users. */
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'validation.required'),
  organizationName: z
    .string()
    .trim()
    .min(ORGANIZATION_NAME_MIN_LENGTH, 'validation.min2')
    .optional(),
  organizationSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(new RegExp(ORGANIZATION_SLUG_PATTERN), 'validation.slug')
    .optional(),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'validation.required'),
  lastName: optionalText,
  email: z.string().trim().email('validation.email'),
  password: z.string().min(PASSWORD_MIN_LENGTH, 'validation.password'),
  organizationName: z.string().trim().min(ORGANIZATION_NAME_MIN_LENGTH, 'validation.min2'),
  organizationSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(new RegExp(ORGANIZATION_SLUG_PATTERN), 'validation.slug'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const createClientSchema = z.object({
  displayName: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  industry: optionalText,
  website: optionalText,
  tier: optionalText,
  contactName: optionalText,
  contactEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'validation.email')
    .transform((v) => (v ? v : undefined)),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const brandKitSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'validation.color'),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'validation.color'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'validation.color'),
  voice: optionalText,
  hashtags: optionalText,
  pillars: optionalText,
});
export type BrandKitInput = z.infer<typeof brandKitSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  type: optionalText,
  endDate: optionalDate,
  budget: z.coerce.number().min(0).optional(),
  status: z.enum(ProjectStatuses).default('ACTIVE'),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  /** Optional — tasks may live in an org inbox without a project. */
  projectId: optionalText,
  clientId: optionalText,
  priority: z.enum(Priorities).default('MEDIUM'),
  status: z.enum(TaskStatuses).default('TODO'),
  dueDate: optionalDate,
  /** @deprecated Prefer assigneeIds; kept for single-select forms. */
  assigneeId: optionalText,
  assigneeIds: z.array(z.string().min(1)).optional().default([]),
  description: optionalText,
  estimateHours: z.coerce.number().min(0).max(200).optional(),
  contentItemId: optionalText,
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Merges legacy single assigneeId into assigneeIds. */
export function resolveTaskAssigneeIds(input: CreateTaskInput): string[] {
  return [...new Set([...(input.assigneeIds ?? []), ...(input.assigneeId ? [input.assigneeId] : [])])];
}

const HASHTAG_SEPARATOR = /[\s,]+/;

export const createContractFormSchema = z.object({
  clientId: z.string().min(1, 'validation.required'),
  title: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  type: z.enum(['NDA', 'MSA', 'SOW', 'OTHER']).default('OTHER'),
  startDate: optionalDate,
  endDate: optionalDate,
});
export type CreateContractFormInput = z.infer<typeof createContractFormSchema>;

export const createContentSchema = z.object({
  title: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  contentType: z.enum(ContentTypes).default('POST'),
  caption: optionalText,
  /**
   * Free text in the form; may already be a string[] after a prior Zod transform
   * (RHF re-validates). Preprocess always normalises to a string first.
   */
  hashtags: z.preprocess(
    (value) => {
      if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').join(' ');
      return typeof value === 'string' ? value : '';
    },
    z
      .string()
      .optional()
      .transform((v) => normalizeHashtags((v ?? '').split(HASHTAG_SEPARATOR))),
  ),
  ctaUrl: z
    .string()
    .trim()
    .max(CONTENT_CTA_URL_MAX_LENGTH)
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, 'validation.url')
    .transform((v) => (v ? v : undefined)),
  pillar: optionalText.refine((v) => !v || v.length <= CONTENT_PILLAR_MAX_LENGTH, 'validation.tooLong'),
  platforms: z.array(z.enum(Platforms)).min(1, 'validation.platform'),
  mediaAssetIds: z.array(z.string().min(1)).max(CONTENT_MEDIA_MAX_DEFAULT).default([]),
  scheduledAt: optionalDate,
  submitForApproval: z.coerce.boolean().default(false),
});
export type CreateContentInput = z.infer<typeof createContentSchema>;

export const createLeadSchema = z.object({
  companyName: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  industry: optionalText,
  source: optionalText,
  website: optionalText,
  estimatedValue: z.coerce.number().min(0).optional(),
  contactName: optionalText,
  contactEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'validation.email')
    .transform((v) => (v ? v : undefined)),
  nextStep: optionalText,
  nextStepAt: optionalText,
  ownerId: optionalText,
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, 'validation.required'),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'validation.required'),
  dueDate: z.string().min(1, 'validation.required'),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  lines: z.array(invoiceLineSchema).min(1, 'validation.lines'),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('validation.email'),
  membershipType: z.enum(MembershipTypes).default('MEMBER'),
  note: optionalText,
  /** Custom roles granted on acceptance instead of the membership type's default role. */
  roleIds: z.array(z.string().min(1)).max(MEMBER_ROLES_MAX).default([]),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const invitePortalUserSchema = z.object({
  email: z.string().trim().email('validation.email'),
});
export type InvitePortalUserInput = z.infer<typeof invitePortalUserSchema>;

const PORTAL_LINK_TTL_HOURS_MAX = 24 * 90;
const PORTAL_MEMBERSHIP_TTL_HOURS_MAX = 24 * 365;
const PORTAL_MAX_USES_MAX = 10_000;

const optionalPositiveInt = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(1).max(max).optional(),
  );

/** Staff creates a multi-use (or single-use) client portal share link. */
export const createShootFormSchema = z.object({
  title: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  startsAt: z.string().min(1, 'validation.required'),
  endsAt: optionalDate,
  allDay: z.coerce.boolean().default(true),
  clientId: z.string().min(1, 'validation.required'),
  projectId: optionalText,
  createFolders: z.coerce.boolean().default(true),
  taskTitles: z.string().optional(),
});
export type CreateShootFormInput = z.infer<typeof createShootFormSchema>;

export const createMediaFolderFormSchema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  parentId: optionalText,
  clientId: optionalText,
  visibility: z.enum(['INTERNAL', 'CLIENT_VISIBLE']).default('INTERNAL'),
});
export type CreateMediaFolderFormInput = z.infer<typeof createMediaFolderFormSchema>;

export const createPortalAccessLinkSchema = z.object({
  accessMode: z.enum(PortalAccessModes).default('TEMPORARY'),
  /** How long the link itself remains redeemable. */
  linkExpiresInHours: optionalPositiveInt(PORTAL_LINK_TTL_HOURS_MAX),
  /** For TEMPORARY: how long portal access lasts after redeem. */
  membershipTtlHours: optionalPositiveInt(PORTAL_MEMBERSHIP_TTL_HOURS_MAX),
  maxUses: optionalPositiveInt(PORTAL_MAX_USES_MAX),
  allowedDomains: z.array(z.string().trim().min(1).max(253)).max(20).default([]),
});
export type CreatePortalAccessLinkInput = z.infer<typeof createPortalAccessLinkSchema>;

/** Client opens a shareable portal link — password required only for PERMANENT (or upgrade). */
export const redeemPortalAccessSchema = z.object({
  token: z.string().min(1, 'validation.required'),
  email: z.string().trim().email('validation.email'),
  firstName: z.string().trim().min(1, 'validation.required').max(100),
  lastName: optionalText,
  password: z.string().min(PASSWORD_MIN_LENGTH, 'validation.password').optional(),
});
export type RedeemPortalAccessInput = z.infer<typeof redeemPortalAccessSchema>;

/** Logged-in temporary client converts to a permanent password login. */
export const claimPortalAccessSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH, 'validation.password'),
});
export type ClaimPortalAccessInput = z.infer<typeof claimPortalAccessSchema>;

/** `firstName` is only required when the invited email has no account yet. */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'validation.required'),
  firstName: optionalText,
  lastName: optionalText,
  password: z.string().min(PASSWORD_MIN_LENGTH, 'validation.password'),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const logTimeSchema = z.object({
  projectId: z.string().min(1, 'validation.required'),
  minutes: z.coerce.number().int().min(1).max(1440),
  date: z.string().min(1, 'validation.required'),
  note: optionalText,
});
export type LogTimeInput = z.infer<typeof logTimeSchema>;

export const createAutomationSchema = z.object({
  name: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  trigger: z.enum(AutomationTriggers, { errorMap: () => ({ message: 'validation.required' }) }),
  action: z.enum(AutomationActions, { errorMap: () => ({ message: 'validation.required' }) }),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const connectIntegrationSchema = z.object({
  handle: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
});
export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>;

export const clientStatusSchema = z.enum(ClientStatuses);

export const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, 'validation.required'),
});

export const ArticleCategories = ['SOP', 'PLAYBOOK', 'TEMPLATE', 'POLICY', 'ONBOARDING'] as const;
export type ArticleCategory = (typeof ArticleCategories)[number];

export const createArticleSchema = z.object({
  title: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  category: z.enum(ArticleCategories).default('SOP'),
  body: z.string().trim().min(10, 'validation.min10'),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  title: optionalText,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const AssetKinds = ['image', 'video', 'document'] as const;
export type AssetKind = (typeof AssetKinds)[number];

export const createAssetSchema = z.object({
  name: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  kind: z.enum(AssetKinds).default('image'),
  tags: optionalText,
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1, 'validation.required').max(2000),
});
export type MessageInput = z.infer<typeof messageSchema>;

export const createChatDmSchema = z.object({
  userId: z.string().uuid('validation.required'),
});
export type CreateChatDmInput = z.infer<typeof createChatDmSchema>;

export const createChatGroupSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(120),
  memberUserIds: z.array(z.string().uuid()).max(100).default([]),
});
export type CreateChatGroupInput = z.infer<typeof createChatGroupSchema>;

export const decisionSchema = z.object({
  contentId: z.string().min(1),
  action: z.enum(ApprovalActions),
  comment: optionalText,
});
export type DecisionInput = z.infer<typeof decisionSchema>;

export const WORKFLOW_STAGE_SEPARATOR = ',';
export const MIN_WORKFLOW_STAGES = 2;
export const MAX_WORKFLOW_STAGES = 20;
export const MAX_WORKFLOW_SLA_HOURS = 720;
export const MAX_WORKFLOW_STAGE_LENGTH = 80;
export const MAX_AUTOMATION_RUN_DETAIL_LENGTH = 500;

/** Splits a comma separated stage list into trimmed, non-empty stage names. */
export function parseWorkflowStages(value: string): string[] {
  return value
    .split(WORKFLOW_STAGE_SEPARATOR)
    .map((stage) => stage.trim())
    .filter(Boolean);
}

const MAX_STAGE_APPROVERS = 50;
const MAX_QUORUM = 50;

export const workflowStageSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_WORKFLOW_STAGE_LENGTH),
    /** Legacy single workflow-role assignee; also merged into roleIds. */
    assigneeRoleId: z.string().uuid().nullish(),
    /** ANY | ALL | QUORUM — how many of the named pool must approve. */
    approvalRule: z.enum(ApprovalStepRules).default('ANY'),
    quorumCount: z.coerce.number().int().min(1).max(MAX_QUORUM).optional(),
    /** Concrete people (user ids) who may approve this stage. */
    approverIds: z.array(z.string().uuid()).max(MAX_STAGE_APPROVERS).default([]),
    /** Roles whose holders form the approver pool (optionally scoped). */
    roleIds: z.array(z.string().uuid()).max(MAX_STAGE_APPROVERS).default([]),
    scopeType: z
      .enum([
        AssignableScopeTypes.ORGANIZATION,
        AssignableScopeTypes.CLIENT,
        AssignableScopeTypes.PROJECT,
        AssignableScopeTypes.WORKSPACE,
        AssignableScopeTypes.TEAM,
        AssignableScopeTypes.DEPARTMENT,
      ])
      .optional(),
    scopeResourceId: z.string().uuid().nullish(),
  })
  .superRefine((stage, ctx) => {
    if (stage.approvalRule === 'QUORUM' && !stage.quorumCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required',
        path: ['quorumCount'],
      });
    }
  });
export type WorkflowStageInput = z.infer<typeof workflowStageSchema>;

export const approvalStepConfigSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    rule: z.enum(ApprovalStepRules).default('ANY'),
    quorumCount: z.coerce.number().int().min(1).max(MAX_QUORUM).optional(),
    approverIds: z.array(z.string().uuid()).max(MAX_STAGE_APPROVERS).default([]),
    roleIds: z.array(z.string().uuid()).max(MAX_STAGE_APPROVERS).default([]),
    scopeType: z.string().optional(),
    scopeResourceId: z.string().uuid().nullish(),
  })
  .superRefine((step, ctx) => {
    if (step.rule === 'QUORUM' && !step.quorumCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.required',
        path: ['quorumCount'],
      });
    }
  });
export type ApprovalStepConfigInput = z.infer<typeof approvalStepConfigSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(RESOURCE_NAME_MIN_LENGTH, 'validation.min2'),
  slaHours: z.coerce.number().int().min(1).max(MAX_WORKFLOW_SLA_HOURS).default(48),
  stages: z
    .array(workflowStageSchema)
    .min(MIN_WORKFLOW_STAGES, 'validation.stages')
    .max(MAX_WORKFLOW_STAGES, 'validation.stages'),
  requiresClientApproval: z.boolean().default(false),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
