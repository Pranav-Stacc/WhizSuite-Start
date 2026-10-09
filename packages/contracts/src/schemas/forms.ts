import { z } from 'zod';
import {
  ApprovalActions,
  AutomationActions,
  AutomationTriggers,
  ClientStatuses,
  ContentTypes,
  MembershipTypes,
  Platforms,
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

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'validation.required'),
  lastName: optionalText,
  email: z.string().trim().email('validation.email'),
  password: z.string().min(PASSWORD_MIN_LENGTH, 'validation.password'),
  organizationName: z.string().trim().min(2, 'validation.min2'),
  organizationSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'validation.slug'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const createClientSchema = z.object({
  displayName: z.string().trim().min(2, 'validation.min2'),
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
  name: z.string().trim().min(2, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  type: optionalText,
  endDate: optionalDate,
  budget: z.coerce.number().min(0).optional(),
  status: z.enum(ProjectStatuses).default('ACTIVE'),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'validation.min2'),
  projectId: z.string().min(1, 'validation.required'),
  priority: z.enum(Priorities).default('MEDIUM'),
  status: z.enum(TaskStatuses).default('TODO'),
  dueDate: optionalDate,
  assigneeId: optionalText,
  description: optionalText,
  estimateHours: z.coerce.number().min(0).max(200).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

const HASHTAG_SEPARATOR = /[\s,]+/;

export const createContentSchema = z.object({
  title: z.string().trim().min(2, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  contentType: z.enum(ContentTypes).default('POST'),
  caption: optionalText,
  /** Free text; split on whitespace/commas and normalised to `#tag` form. */
  hashtags: z
    .string()
    .optional()
    .transform((v) => normalizeHashtags((v ?? '').split(HASHTAG_SEPARATOR))),
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
  companyName: z.string().trim().min(2, 'validation.min2'),
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
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const invitePortalUserSchema = z.object({
  email: z.string().trim().email('validation.email'),
});
export type InvitePortalUserInput = z.infer<typeof invitePortalUserSchema>;

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
  name: z.string().trim().min(2, 'validation.min2'),
  trigger: z.enum(AutomationTriggers, { errorMap: () => ({ message: 'validation.required' }) }),
  action: z.enum(AutomationActions, { errorMap: () => ({ message: 'validation.required' }) }),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const connectIntegrationSchema = z.object({
  handle: z.string().trim().min(2, 'validation.min2'),
});
export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>;

export const clientStatusSchema = z.enum(ClientStatuses);

export const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, 'validation.required'),
});

export const ArticleCategories = ['SOP', 'PLAYBOOK', 'TEMPLATE', 'POLICY', 'ONBOARDING'] as const;
export type ArticleCategory = (typeof ArticleCategories)[number];

export const createArticleSchema = z.object({
  title: z.string().trim().min(2, 'validation.min2'),
  category: z.enum(ArticleCategories).default('SOP'),
  body: z.string().trim().min(10, 'validation.min10'),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'validation.min2'),
  title: optionalText,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const AssetKinds = ['image', 'video', 'document'] as const;
export type AssetKind = (typeof AssetKinds)[number];

export const createAssetSchema = z.object({
  name: z.string().trim().min(2, 'validation.min2'),
  clientId: z.string().min(1, 'validation.required'),
  kind: z.enum(AssetKinds).default('image'),
  tags: optionalText,
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1, 'validation.required').max(2000),
});
export type MessageInput = z.infer<typeof messageSchema>;

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

/** Splits a comma separated stage list into trimmed, non-empty stage names. */
export function parseWorkflowStages(value: string): string[] {
  return value
    .split(WORKFLOW_STAGE_SEPARATOR)
    .map((stage) => stage.trim())
    .filter(Boolean);
}

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(2, 'validation.min2'),
  slaHours: z.coerce.number().int().min(1).max(MAX_WORKFLOW_SLA_HOURS).default(48),
  stages: z
    .string()
    .trim()
    .refine((value) => {
      const count = parseWorkflowStages(value).length;
      return count >= MIN_WORKFLOW_STAGES && count <= MAX_WORKFLOW_STAGES;
    }, 'validation.stages'),
  requiresClientApproval: z.boolean().default(false),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
