import { z } from 'zod';
import { ApiContentTypes } from '../content/content.js';
import { ApprovalActions } from '../domain/statuses.js';
import {
  ClientStatuses,
  ContentStatuses,
  Platforms,
  Priorities,
  TaskStatuses,
} from '../domain/statuses.js';

export const uuid = z.string().uuid();
export const optionalUuid = z.string().uuid().optional();
export const emptyInput = z.object({});

export const clientsListInput = z.object({ workspaceId: optionalUuid });
export const clientsGetInput = z.object({ clientId: uuid });
export const clientsCreateInput = z.object({
  workspaceId: optionalUuid,
  displayName: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
});
export const clientsUpdateInput = z.object({
  clientId: uuid,
  displayName: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  status: z.enum(ClientStatuses).optional(),
});
export const clientsBrandKitInput = z.object({
  clientId: uuid,
  voice: z.string().max(2000).optional(),
  pillars: z.array(z.string()).optional(),
  bannedWords: z.array(z.string()).optional(),
  primaryColor: z.string().max(40).optional(),
});

export const leadsListInput = emptyInput;
export const leadsGetInput = z.object({ leadId: uuid });
export const leadsCreateInput = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  stage: z.string().optional(),
});
export const leadsUpdateInput = z.object({
  leadId: uuid,
  companyName: z.string().min(1).max(200).optional(),
  stage: z.string().optional(),
  nextStep: z.string().max(500).optional(),
});
export const leadsDeleteInput = z.object({ leadId: uuid });
export const leadsConvertInput = z.object({
  leadId: uuid,
  displayName: z.string().min(1).max(200).optional(),
  workspaceId: optionalUuid,
});

export const projectsListInput = emptyInput;
export const projectsGetInput = z.object({ projectId: uuid });
export const projectsCreateInput = z.object({
  clientId: uuid,
  workspaceId: optionalUuid,
  name: z.string().min(1).max(200),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export const projectsUpdateInput = z.object({
  projectId: uuid,
  name: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
});

export const tasksListInput = z.object({ projectId: optionalUuid });
export const tasksGetInput = z.object({ taskId: uuid });
export const tasksCreateInput = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10_000).optional(),
  projectId: optionalUuid,
  clientId: optionalUuid,
  status: z.enum(TaskStatuses).optional(),
  priority: z.enum(Priorities).optional(),
  dueDate: z.string().optional(),
  assigneeUserIds: z.array(uuid).optional(),
});
export const tasksUpdateInput = z.object({
  taskId: uuid,
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10_000).optional(),
  status: z.enum(TaskStatuses).optional(),
  priority: z.enum(Priorities).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeUserIds: z.array(uuid).optional(),
});
export const tasksSetPriorityInput = z.object({
  taskIds: z.array(uuid).min(1).max(50),
  priority: z.enum(Priorities),
});
export const tasksDeleteInput = z.object({ taskId: uuid });
export const tasksTransitionInput = z.object({
  taskId: uuid,
  status: z.enum(TaskStatuses),
});
export const tasksCommentInput = z.object({
  taskId: uuid,
  body: z.string().min(1).max(5000),
});

export const contentListInput = z.object({
  clientId: optionalUuid,
  status: z.enum(ContentStatuses).optional(),
});
export const contentGetInput = z.object({ contentId: uuid });
export const contentCreateInput = z.object({
  clientId: uuid,
  projectId: optionalUuid,
  title: z.string().min(1).max(300),
  caption: z.string().max(10_000).optional(),
  contentType: z.enum(ApiContentTypes),
  platforms: z.array(z.enum(Platforms)).optional(),
  scheduledAt: z.string().datetime().optional(),
});
export const contentUpdateInput = z.object({
  contentId: uuid,
  title: z.string().min(1).max(300).optional(),
  caption: z.string().max(10_000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});
export const contentDeleteInput = z.object({ contentId: uuid });
export const contentTransitionInput = z.object({
  contentId: uuid,
  status: z.enum(ContentStatuses),
});
export const contentReviewInput = z.object({
  contentId: uuid,
  status: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'DRAFT'] as const),
});
export const contentReorderInput = z.object({
  clientId: uuid,
  orderedIds: z.array(uuid).min(1).max(200),
});
export const contentScheduleVariantInput = z.object({
  variantId: uuid,
  scheduledAt: z.string().datetime(),
});

export const calendarListInput = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export const calendarGetInput = z.object({ itemId: uuid });
export const calendarCreateInput = z.object({
  title: z.string().min(1).max(300),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  clientId: optionalUuid,
  projectId: optionalUuid,
  allDay: z.boolean().optional(),
  syncToGoogle: z.boolean().optional(),
});
export const calendarUpdateInput = z.object({
  itemId: uuid,
  title: z.string().min(1).max(300).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  syncToGoogle: z.boolean().optional(),
});
export const calendarShootCreateInput = z.object({
  title: z.string().min(1).max(300),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  clientId: uuid,
  projectId: optionalUuid,
  location: z.string().max(500).optional(),
});

export const chatRoomsListInput = emptyInput;
export const chatMessagesListInput = z.object({
  roomId: uuid,
  limit: z.number().int().positive().max(100).optional(),
});
export const chatSendInput = z.object({
  roomId: uuid,
  body: z.string().min(1).max(10_000),
});
export const chatCreateGroupInput = z.object({
  name: z.string().min(1).max(200),
  memberUserIds: z.array(uuid).min(1).max(50),
});
export const chatOpenDmInput = z.object({ otherUserId: uuid });
export const chatClientRoomInput = z.object({ clientId: uuid });
export const chatEditMessageInput = z.object({
  roomId: uuid,
  messageId: uuid,
  body: z.string().min(1).max(10_000),
});
export const chatDeleteMessageInput = z.object({
  roomId: uuid,
  messageId: uuid,
});
export const chatMarkReadInput = z.object({
  roomId: uuid,
  messageId: uuid,
});

export const mediaListInput = z.object({ clientId: optionalUuid });
export const mediaGetInput = z.object({ assetId: uuid });
export const mediaUpdateInput = z.object({
  assetId: uuid,
  name: z.string().min(1).max(300).optional(),
  tags: z.array(z.string()).optional(),
});
export const mediaDeleteInput = z.object({ assetId: uuid });
export const mediaDownloadInput = z.object({ assetId: uuid });
export const mediaPresignInput = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  clientId: optionalUuid,
});
export const mediaFoldersListInput = z.object({ clientId: optionalUuid });
export const mediaFoldersCreateInput = z.object({
  name: z.string().min(1).max(200),
  parentId: optionalUuid,
  clientId: optionalUuid,
});
export const mediaFoldersDeleteInput = z.object({ folderId: uuid });
export const mediaFoldersEnsureClientInput = z.object({ clientId: uuid });

export const approvalsListInput = emptyInput;
export const approvalsGetInput = z.object({ approvalId: uuid });
export const approvalsCreateInput = z.object({
  subjectType: z.string().min(1),
  subjectId: uuid,
  subjectVersion: z.string().min(1).default('1'),
  stepName: z.string().min(1).max(200).default('Review'),
});
export const approvalsActInput = z.object({
  approvalId: uuid,
  action: z.enum(ApprovalActions),
  comment: z.string().max(2000).optional(),
});

export const invoicesListInput = z.object({ clientId: optionalUuid });
export const invoicesGetInput = z.object({ invoiceId: uuid });
export const invoicesCreateInput = z.object({
  clientId: uuid,
  number: z.string().min(1).max(40),
  dueDate: z.string().min(1),
  taxRate: z.number().min(0).max(100).default(0),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitMinor: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});
export const invoicesUpdateInput = z.object({
  invoiceId: uuid,
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});
export const invoicesDeleteInput = z.object({ invoiceId: uuid });

export const contractsListInput = z.object({ clientId: optionalUuid });
export const contractsCreateInput = z.object({
  clientId: uuid,
  title: z.string().min(1).max(300),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['NDA', 'MSA', 'SOW', 'OTHER']).optional(),
});
export const contractsUpdateInput = z.object({
  contractId: uuid,
  title: z.string().min(1).max(300).optional(),
});
export const contractsSignInput = z.object({
  contractId: uuid,
  signerName: z.string().min(1).max(120),
  method: z.enum(['TYPED', 'DRAWN']).optional(),
});
export const contractsDownloadInput = z.object({ contractId: uuid });

export const timeListInput = emptyInput;
export const timeGetInput = z.object({ entryId: uuid });
export const timeCreateInput = z.object({
  projectId: optionalUuid,
  taskId: optionalUuid,
  clientId: optionalUuid,
  minutes: z.number().int().positive(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
});
export const timeDeleteInput = z.object({ entryId: uuid });
export const timeTimerStartInput = z.object({ taskId: uuid });
export const timeTimerStopInput = emptyInput;

export const searchQueryInput = z.object({ query: z.string().min(1).max(500) });
export const summaryInput = z.object({
  scope: z.enum(['organization', 'client', 'project']),
  clientId: optionalUuid,
  projectId: optionalUuid,
});

export const automationsListInput = emptyInput;
export const automationsGetInput = z.object({ automationId: uuid });
export const automationsRunInput = z.object({ automationId: uuid });
export const automationsCreateInput = z.object({
  name: z.string().min(1).max(200),
  trigger: z.string().min(1),
  action: z.string().min(1),
  enabled: z.boolean().optional(),
});
export const automationsUpdateInput = z.object({
  automationId: uuid,
  name: z.string().min(1).max(200).optional(),
  trigger: z.string().optional(),
  action: z.string().optional(),
  enabled: z.boolean().optional(),
});
export const automationsIdInput = z.object({ automationId: uuid });

export const notificationsListInput = z.object({
  unreadOnly: z.boolean().optional(),
});
export const notificationsMarkReadInput = z.object({ notificationId: uuid });

export const knowledgeListInput = emptyInput;
export const knowledgeGetInput = z.object({ articleId: uuid });
export const knowledgeCreateInput = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(100_000),
  category: z.string().max(100).optional(),
});
export const knowledgeUpdateInput = z.object({
  articleId: uuid,
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(100_000).optional(),
  category: z.string().max(100).optional(),
});
export const knowledgeDeleteInput = z.object({ articleId: uuid });

export const workflowsListInput = emptyInput;
export const workflowsGetInput = z.object({ workflowId: uuid });
export const workflowsCreateInput = z.object({
  name: z.string().min(1).max(200),
  entityType: z.string().min(1).default('CONTENT'),
  stages: z
    .array(z.object({ name: z.string().min(1), key: z.string().min(1) }))
    .min(1),
  slaHours: z.number().int().positive().optional(),
  requiresClientApproval: z.boolean().optional(),
  active: z.boolean().optional(),
});
export const workflowsUpdateInput = z.object({
  workflowId: uuid,
  name: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
});
export const workflowsDeleteInput = z.object({ workflowId: uuid });
export const workflowsPublishInput = z.object({ versionId: uuid });

export const integrationsListInput = emptyInput;
export const integrationsGetInput = z.object({ connectionId: uuid });
export const integrationsCreateInput = z.object({
  providerId: uuid,
  clientId: optionalUuid,
  label: z.string().max(200).optional(),
});
export const integrationsUpdateInput = z.object({
  connectionId: uuid,
  status: z.string().optional(),
  label: z.string().max(200).optional(),
});

export const feedbackListInput = emptyInput;
export const feedbackGetInput = z.object({ threadId: uuid });
export const feedbackCreateInput = z.object({
  subjectType: z.string().min(1),
  subjectId: uuid,
  title: z.string().min(1).max(300).optional(),
});
export const feedbackUpdateInput = z.object({
  threadId: uuid,
  status: z.string().optional(),
});
export const feedbackCommentsListInput = z.object({
  subjectType: z.string().min(1),
  subjectId: uuid,
});
export const feedbackCommentsAddInput = z.object({
  subjectType: z.string().min(1),
  subjectId: uuid,
  body: z.string().min(1).max(5000),
});

export const reportsListInput = emptyInput;
export const reportsGetInput = z.object({ reportId: uuid });
export const reportsCreateInput = z.object({
  clientId: uuid,
  title: z.string().min(1).max(300),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export const analyticsListInput = z.object({
  from: z.string().optional(),
  metrics: z.array(z.string()).optional(),
});

export const auditListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const membersListInput = emptyInput;
export const membersInviteInput = z.object({
  email: z.string().email(),
  membershipType: z.enum(['ADMIN', 'MEMBER', 'CLIENT']).default('MEMBER'),
  clientId: optionalUuid,
});
export const membersAssignRolesInput = z.object({
  userId: uuid,
  roleIds: z.array(uuid).min(1).max(10),
});
export const membersDeactivateInput = z.object({ userId: uuid });
export const invitationsRevokeInput = z.object({ invitationId: uuid });

export const rolesListInput = z.object({
  kind: z.enum(['ACCESS', 'WORKFLOW']).optional(),
});
export const rolesCreateInput = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(280).optional(),
  permissions: z.array(z.string()).min(1),
});
export const rolesUpdateInput = z.object({
  roleId: uuid,
  name: z.string().min(1).max(60).optional(),
  permissions: z.array(z.string()).optional(),
});
export const rolesDeleteInput = z.object({ roleId: uuid });

export const departmentsListInput = emptyInput;
export const departmentsCreateInput = z.object({
  name: z.string().min(1).max(200),
  parentId: optionalUuid,
});
export const teamsCreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  workspaceId: optionalUuid,
});
export const workspacesListInput = emptyInput;
export const workspacesCreateInput = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80),
  timezone: z.string().optional(),
});
export const orgGetInput = emptyInput;
export const orgThemeUpdateInput = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
  border: z.string().optional(),
});

export const billingPlansListInput = emptyInput;
export const billingSubscriptionGetInput = emptyInput;

export const agentScheduleCreateInput = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(10_000),
  cron: z.string().min(1).max(100),
  timezone: z.string().default('UTC'),
  agentDefinitionId: optionalUuid,
});
export const agentDefinitionCreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  systemPrompt: z.string().min(1).max(20_000),
  toolIds: z.array(z.string()).optional(),
  subAgents: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        role: z.string().min(1).max(500),
      }),
    )
    .optional(),
});
export const agentDefinitionsListInput = emptyInput;
export const agentSchedulesListInput = emptyInput;
