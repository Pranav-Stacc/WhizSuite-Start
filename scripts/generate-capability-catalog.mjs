import fs from 'node:fs';

const R = {
  READ: 'CapabilityRiskTiers.READ',
  LOW: 'CapabilityRiskTiers.WRITE_LOW',
  MED: 'CapabilityRiskTiers.WRITE_MEDIUM',
  HIGH: 'CapabilityRiskTiers.WRITE_HIGH',
};

/** @type {Array<[string, string, string, string, string[], string, string, boolean?]>} */
const tools = [
  ['clients.list', 'clients', 'List clients', 'List all clients visible to the user', ['CLIENTS_VIEW'], R.READ, 'clientsListInput'],
  ['clients.get', 'clients', 'Get client', 'Get a client by ID', ['CLIENTS_VIEW'], R.READ, 'clientsGetInput'],
  ['clients.create', 'clients', 'Create client', 'Create a new client account', ['CLIENTS_CREATE'], R.LOW, 'clientsCreateInput'],
  ['clients.update', 'clients', 'Update client', 'Update client details or status', ['CLIENTS_EDIT'], R.MED, 'clientsUpdateInput'],
  ['clients.brand_kit.update', 'clients', 'Update brand kit', 'Update client brand kit', ['CLIENTS_EDIT'], R.MED, 'clientsBrandKitInput'],
  ['leads.list', 'crm', 'List leads', 'List pipeline leads', ['LEADS_VIEW'], R.READ, 'leadsListInput'],
  ['leads.get', 'crm', 'Get lead', 'Get lead details', ['LEADS_VIEW'], R.READ, 'leadsGetInput'],
  ['leads.create', 'crm', 'Create lead', 'Add a new lead', ['LEADS_CREATE'], R.LOW, 'leadsCreateInput'],
  ['leads.update', 'crm', 'Update lead', 'Update lead stage or details', ['LEADS_CREATE'], R.LOW, 'leadsUpdateInput'],
  ['leads.delete', 'crm', 'Delete lead', 'Delete a lead', ['LEADS_CREATE'], R.MED, 'leadsDeleteInput'],
  ['leads.convert', 'crm', 'Convert lead', 'Convert lead to client', ['LEADS_CONVERT'], R.HIGH, 'leadsConvertInput', true],
  ['projects.list', 'work', 'List projects', 'List projects', ['PROJECTS_VIEW'], R.READ, 'projectsListInput'],
  ['projects.get', 'work', 'Get project', 'Get project details', ['PROJECTS_VIEW'], R.READ, 'projectsGetInput'],
  ['projects.create', 'work', 'Create project', 'Create a project', ['PROJECTS_CREATE'], R.LOW, 'projectsCreateInput'],
  ['projects.update', 'work', 'Update project', 'Update project', ['PROJECTS_EDIT'], R.MED, 'projectsUpdateInput'],
  ['tasks.list', 'work', 'List tasks', 'List tasks', ['TASKS_VIEW'], R.READ, 'tasksListInput'],
  ['tasks.get', 'work', 'Get task', 'Get task details', ['TASKS_VIEW'], R.READ, 'tasksGetInput'],
  ['tasks.create', 'work', 'Create task', 'Create a task', ['TASKS_CREATE'], R.LOW, 'tasksCreateInput'],
  ['tasks.update', 'work', 'Update task', 'Update task fields', ['TASKS_EDIT'], R.LOW, 'tasksUpdateInput'],
  ['tasks.set_priority', 'work', 'Set task priority', 'Bulk update priority', ['TASKS_EDIT'], R.LOW, 'tasksSetPriorityInput'],
  ['tasks.delete', 'work', 'Delete task', 'Delete a task', ['TASKS_DELETE'], R.MED, 'tasksDeleteInput'],
  ['tasks.transition', 'work', 'Transition task', 'Change task status', ['TASKS_TRANSITION'], R.LOW, 'tasksTransitionInput'],
  ['tasks.comment', 'work', 'Comment on task', 'Add a task comment', ['TASKS_EDIT'], R.LOW, 'tasksCommentInput'],
  ['content.list', 'content', 'List content', 'List content items', ['CONTENT_VIEW'], R.READ, 'contentListInput'],
  ['content.get', 'content', 'Get content', 'Get content details', ['CONTENT_VIEW'], R.READ, 'contentGetInput'],
  ['content.create', 'content', 'Create content', 'Create draft content', ['CONTENT_CREATE'], R.LOW, 'contentCreateInput'],
  ['content.update', 'content', 'Update content', 'Update content', ['CONTENT_EDIT'], R.MED, 'contentUpdateInput'],
  ['content.schedule', 'content', 'Schedule content', 'Schedule content publish time', ['SOCIAL_SCHEDULE'], R.HIGH, 'contentUpdateInput', true],
  ['content.delete', 'content', 'Delete content', 'Delete content', ['CONTENT_DELETE'], R.MED, 'contentDeleteInput'],
  ['content.transition', 'content', 'Transition content', 'Change content status', ['CONTENT_EDIT'], R.MED, 'contentTransitionInput'],
  ['content.review', 'content', 'Review content', 'Approve or request changes', ['CONTENT_EDIT'], R.MED, 'contentReviewInput'],
  ['content.reorder', 'content', 'Reorder content', 'Reorder client content grid', ['CONTENT_EDIT'], R.LOW, 'contentReorderInput'],
  ['content.schedule_variant', 'content', 'Schedule variant', 'Schedule a content variant', ['SOCIAL_SCHEDULE'], R.HIGH, 'contentScheduleVariantInput', true],
  ['content.publish', 'content', 'Publish content', 'Move content to published', ['SOCIAL_PUBLISH'], R.HIGH, 'contentTransitionInput', true],
  ['calendar.list', 'calendar', 'List calendar', 'List calendar feed', ['CONTENT_VIEW'], R.READ, 'calendarListInput'],
  ['calendar.get', 'calendar', 'Get calendar item', 'Get calendar item', ['CONTENT_VIEW'], R.READ, 'calendarGetInput'],
  ['calendar.create', 'calendar', 'Create calendar event', 'Create calendar event', ['CONTENT_CREATE'], R.LOW, 'calendarCreateInput'],
  ['calendar.update', 'calendar', 'Update calendar event', 'Update calendar event', ['CONTENT_CREATE'], R.LOW, 'calendarUpdateInput'],
  ['calendar.shoots.create', 'calendar', 'Create shoot', 'Create a shoot event', ['PROJECTS_CREATE'], R.MED, 'calendarShootCreateInput'],
  ['chat.rooms.list', 'chat', 'List chat rooms', 'List chat rooms', ['CHAT_VIEW'], R.READ, 'chatRoomsListInput'],
  ['chat.messages.list', 'chat', 'List messages', 'List room messages', ['CHAT_VIEW'], R.READ, 'chatMessagesListInput'],
  ['chat.messages.send', 'chat', 'Send message', 'Send chat message', ['CHAT_SEND'], R.LOW, 'chatSendInput'],
  ['chat.rooms.create', 'chat', 'Create group', 'Create group chat', ['CHAT_CREATE_ROOM'], R.LOW, 'chatCreateGroupInput'],
  ['chat.dms.open', 'chat', 'Open DM', 'Open or create DM', ['CHAT_CREATE_ROOM'], R.LOW, 'chatOpenDmInput'],
  ['chat.rooms.client', 'chat', 'Open client room', 'Open client chat room', ['CHAT_CREATE_ROOM'], R.LOW, 'chatClientRoomInput'],
  ['chat.messages.edit', 'chat', 'Edit message', 'Edit chat message', ['CHAT_SEND'], R.LOW, 'chatEditMessageInput'],
  ['chat.messages.delete', 'chat', 'Delete message', 'Delete chat message', ['CHAT_MANAGE'], R.MED, 'chatDeleteMessageInput'],
  ['chat.mark_read', 'chat', 'Mark read', 'Mark messages read', ['CHAT_VIEW'], R.LOW, 'chatMarkReadInput'],
  ['media.list', 'media', 'List media', 'List media assets', ['FILES_VIEW'], R.READ, 'mediaListInput'],
  ['media.get', 'media', 'Get media', 'Get media asset', ['FILES_VIEW'], R.READ, 'mediaGetInput'],
  ['media.update', 'media', 'Update media', 'Update media metadata', ['FILES_UPLOAD'], R.LOW, 'mediaUpdateInput'],
  ['media.delete', 'media', 'Delete media', 'Delete media asset', ['FILES_DELETE'], R.MED, 'mediaDeleteInput'],
  ['media.download_url', 'media', 'Download URL', 'Get media download URL', ['FILES_VIEW'], R.READ, 'mediaDownloadInput'],
  ['media.upload', 'media', 'Presign upload', 'Create presigned media upload', ['FILES_UPLOAD'], R.MED, 'mediaPresignInput'],
  ['media.folders.list', 'media', 'List folders', 'List media folders', ['FILES_VIEW'], R.READ, 'mediaFoldersListInput'],
  ['media.folders.create', 'media', 'Create folder', 'Create media folder', ['FILES_UPLOAD'], R.LOW, 'mediaFoldersCreateInput'],
  ['media.folders.delete', 'media', 'Delete folder', 'Delete media folder', ['FILES_DELETE'], R.MED, 'mediaFoldersDeleteInput'],
  ['media.folders.ensure_client', 'media', 'Ensure client folders', 'Ensure client folder tree', ['FILES_UPLOAD'], R.LOW, 'mediaFoldersEnsureClientInput'],
  ['approvals.list', 'approvals', 'List approvals', 'List approval requests', ['APPROVALS_VIEW'], R.READ, 'approvalsListInput'],
  ['approvals.get', 'approvals', 'Get approval', 'Get approval request', ['APPROVALS_VIEW'], R.READ, 'approvalsGetInput'],
  ['approvals.create', 'approvals', 'Create approval', 'Request approval', ['APPROVALS_CREATE'], R.MED, 'approvalsCreateInput'],
  ['approvals.act', 'approvals', 'Act on approval', 'Approve or reject', ['APPROVALS_APPROVE'], R.HIGH, 'approvalsActInput', true],
  ['invoices.list', 'finance', 'List invoices', 'List invoices', ['INVOICES_VIEW'], R.READ, 'invoicesListInput'],
  ['invoices.get', 'finance', 'Get invoice', 'Get invoice', ['INVOICES_VIEW'], R.READ, 'invoicesGetInput'],
  ['invoices.create', 'finance', 'Create invoice', 'Create draft invoice', ['INVOICES_CREATE'], R.HIGH, 'invoicesCreateInput', true],
  ['invoices.update', 'finance', 'Update invoice', 'Update invoice', ['INVOICES_CREATE'], R.HIGH, 'invoicesUpdateInput', true],
  ['invoices.delete', 'finance', 'Delete invoice', 'Delete invoice', ['INVOICES_CREATE'], R.HIGH, 'invoicesDeleteInput', true],
  ['contracts.list', 'finance', 'List contracts', 'List contracts', ['INVOICES_VIEW'], R.READ, 'contractsListInput'],
  ['contracts.create', 'finance', 'Create contract', 'Create contract', ['INVOICES_CREATE'], R.HIGH, 'contractsCreateInput', true],
  ['contracts.update', 'finance', 'Update contract', 'Update contract', ['INVOICES_CREATE'], R.HIGH, 'contractsUpdateInput', true],
  ['contracts.sign', 'finance', 'Sign contract', 'Sign contract', ['INVOICES_CREATE'], R.HIGH, 'contractsSignInput', true],
  ['contracts.download_url', 'finance', 'Contract download', 'Get contract download URL', ['INVOICES_VIEW'], R.READ, 'contractsDownloadInput'],
  ['time.list', 'time', 'List time entries', 'List time entries', ['TIME_TRACK'], R.READ, 'timeListInput'],
  ['time.get', 'time', 'Get time entry', 'Get time entry', ['TIME_TRACK'], R.READ, 'timeGetInput'],
  ['time.create', 'time', 'Log time', 'Create time entry', ['TIME_TRACK'], R.LOW, 'timeCreateInput'],
  ['time.delete', 'time', 'Delete time entry', 'Delete time entry', ['TIME_TRACK'], R.LOW, 'timeDeleteInput'],
  ['time.timer.get', 'time', 'Get running timer', 'Get running timer', ['TIME_TRACK'], R.READ, 'emptyInput'],
  ['time.timer.start', 'time', 'Start timer', 'Start timer on task', ['TIME_TRACK'], R.LOW, 'timeTimerStartInput'],
  ['time.timer.stop', 'time', 'Stop timer', 'Stop running timer', ['TIME_TRACK'], R.LOW, 'timeTimerStopInput'],
  ['automations.list', 'automations', 'List automations', 'List automations', ['AUTOMATIONS_MANAGE'], R.READ, 'automationsListInput'],
  ['automations.get', 'automations', 'Get automation', 'Get automation', ['AUTOMATIONS_MANAGE'], R.READ, 'automationsGetInput'],
  ['automations.run', 'automations', 'Run automation', 'Run automation', ['AUTOMATIONS_MANAGE'], R.MED, 'automationsRunInput'],
  ['automations.create', 'automations', 'Create automation', 'Create automation', ['AUTOMATIONS_MANAGE'], R.MED, 'automationsCreateInput'],
  ['automations.update', 'automations', 'Update automation', 'Update automation', ['AUTOMATIONS_MANAGE'], R.MED, 'automationsUpdateInput'],
  ['automations.publish', 'automations', 'Publish automation', 'Publish automation', ['AUTOMATIONS_MANAGE'], R.MED, 'automationsIdInput'],
  ['automations.archive', 'automations', 'Archive automation', 'Archive automation', ['AUTOMATIONS_MANAGE'], R.MED, 'automationsIdInput'],
  ['automations.runs.list', 'automations', 'List automation runs', 'List recent runs', ['AUTOMATIONS_MANAGE'], R.READ, 'automationsListInput'],
  ['search.query', 'search', 'Search', 'Search org entities', ['ORG_VIEW'], R.READ, 'searchQueryInput'],
  ['intelligence.summarize', 'intelligence', 'Summarize', 'Summarize health', ['ORG_VIEW'], R.READ, 'summaryInput'],
  ['notifications.list', 'notifications', 'List notifications', 'List notifications', ['ORG_VIEW'], R.READ, 'notificationsListInput'],
  ['notifications.mark_read', 'notifications', 'Mark notification read', 'Mark one read', ['ORG_VIEW'], R.LOW, 'notificationsMarkReadInput'],
  ['notifications.mark_all_read', 'notifications', 'Mark all read', 'Mark all notifications read', ['ORG_VIEW'], R.LOW, 'emptyInput'],
  ['knowledge.list', 'knowledge', 'List articles', 'List knowledge articles', ['ORG_VIEW'], R.READ, 'knowledgeListInput'],
  ['knowledge.get', 'knowledge', 'Get article', 'Get knowledge article', ['ORG_VIEW'], R.READ, 'knowledgeGetInput'],
  ['knowledge.create', 'knowledge', 'Create article', 'Create knowledge article', ['ORG_SETTINGS_MANAGE'], R.MED, 'knowledgeCreateInput'],
  ['knowledge.update', 'knowledge', 'Update article', 'Update knowledge article', ['ORG_SETTINGS_MANAGE'], R.MED, 'knowledgeUpdateInput'],
  ['knowledge.delete', 'knowledge', 'Delete article', 'Delete knowledge article', ['ORG_SETTINGS_MANAGE'], R.MED, 'knowledgeDeleteInput'],
  ['workflows.list', 'workflows', 'List workflows', 'List workflow definitions', ['WORKFLOWS_MANAGE'], R.READ, 'workflowsListInput'],
  ['workflows.get', 'workflows', 'Get workflow', 'Get workflow', ['WORKFLOWS_MANAGE'], R.READ, 'workflowsGetInput'],
  ['workflows.create', 'workflows', 'Create workflow', 'Create workflow', ['WORKFLOWS_MANAGE'], R.MED, 'workflowsCreateInput'],
  ['workflows.update', 'workflows', 'Update workflow', 'Update workflow', ['WORKFLOWS_MANAGE'], R.MED, 'workflowsUpdateInput'],
  ['workflows.delete', 'workflows', 'Delete workflow', 'Delete workflow', ['WORKFLOWS_MANAGE'], R.HIGH, 'workflowsDeleteInput', true],
  ['workflows.publish', 'workflows', 'Publish workflow version', 'Publish workflow version', ['WORKFLOWS_MANAGE'], R.HIGH, 'workflowsPublishInput', true],
  ['integrations.list', 'integrations', 'List integrations', 'List integration connections', ['INTEGRATIONS_MANAGE'], R.READ, 'integrationsListInput'],
  ['integrations.get', 'integrations', 'Get integration', 'Get connection', ['INTEGRATIONS_MANAGE'], R.READ, 'integrationsGetInput'],
  ['integrations.create', 'integrations', 'Create integration', 'Create connection', ['INTEGRATIONS_MANAGE'], R.HIGH, 'integrationsCreateInput', true],
  ['integrations.update', 'integrations', 'Update integration', 'Update connection', ['INTEGRATIONS_MANAGE'], R.HIGH, 'integrationsUpdateInput', true],
  ['feedback.list', 'feedback', 'List feedback', 'List feedback threads', ['FEEDBACK_VIEW'], R.READ, 'feedbackListInput'],
  ['feedback.get', 'feedback', 'Get feedback', 'Get feedback thread', ['FEEDBACK_VIEW'], R.READ, 'feedbackGetInput'],
  ['feedback.create', 'feedback', 'Create feedback', 'Create feedback thread', ['FEEDBACK_CREATE'], R.LOW, 'feedbackCreateInput'],
  ['feedback.update', 'feedback', 'Update feedback', 'Update feedback thread', ['FEEDBACK_RESOLVE'], R.LOW, 'feedbackUpdateInput'],
  ['feedback.comments.list', 'feedback', 'List feedback comments', 'List subject comments', ['FEEDBACK_VIEW'], R.READ, 'feedbackCommentsListInput'],
  ['feedback.comments.add', 'feedback', 'Add feedback comment', 'Add subject comment', ['FEEDBACK_CREATE'], R.LOW, 'feedbackCommentsAddInput'],
  ['reports.list', 'reporting', 'List reports', 'List reports', ['REPORTS_VIEW'], R.READ, 'reportsListInput'],
  ['reports.get', 'reporting', 'Get report', 'Get report', ['REPORTS_VIEW'], R.READ, 'reportsGetInput'],
  ['reports.create', 'reporting', 'Create report', 'Create report', ['REPORTS_VIEW'], R.MED, 'reportsCreateInput'],
  ['analytics.list', 'analytics', 'List metrics', 'List metric snapshots', ['REPORTS_VIEW'], R.READ, 'analyticsListInput'],
  ['audit.list', 'audit', 'List audit log', 'List audit events', ['AUDIT_VIEW'], R.READ, 'auditListInput'],
  ['members.list', 'identity', 'List members', 'List org members', ['MEMBERS_VIEW'], R.READ, 'membersListInput'],
  ['members.invite', 'identity', 'Invite member', 'Invite a member', ['MEMBERS_INVITE'], R.HIGH, 'membersInviteInput', true],
  ['members.assign_roles', 'identity', 'Assign roles', 'Assign roles to member', ['MEMBERS_EDIT'], R.HIGH, 'membersAssignRolesInput', true],
  ['members.deactivate', 'identity', 'Deactivate member', 'Deactivate member', ['MEMBERS_DEACTIVATE'], R.HIGH, 'membersDeactivateInput', true],
  ['invitations.revoke', 'identity', 'Revoke invitation', 'Revoke invitation', ['MEMBERS_INVITE'], R.MED, 'invitationsRevokeInput'],
  ['roles.list', 'access', 'List roles', 'List roles', ['ROLES_MANAGE'], R.READ, 'rolesListInput'],
  ['roles.create', 'access', 'Create role', 'Create role', ['ROLES_MANAGE'], R.HIGH, 'rolesCreateInput', true],
  ['roles.update', 'access', 'Update role', 'Update role', ['ROLES_MANAGE'], R.HIGH, 'rolesUpdateInput', true],
  ['roles.delete', 'access', 'Delete role', 'Delete role', ['ROLES_MANAGE'], R.HIGH, 'rolesDeleteInput', true],
  ['departments.list', 'tenancy', 'List departments', 'List departments', ['ORG_SETTINGS_MANAGE'], R.READ, 'departmentsListInput'],
  ['departments.create', 'tenancy', 'Create department', 'Create department', ['ORG_SETTINGS_MANAGE'], R.MED, 'departmentsCreateInput'],
  ['teams.create', 'tenancy', 'Create team', 'Create team', ['ORG_SETTINGS_MANAGE'], R.MED, 'teamsCreateInput'],
  ['workspaces.list', 'tenancy', 'List workspaces', 'List workspaces', ['WORKSPACES_VIEW'], R.READ, 'workspacesListInput'],
  ['workspaces.create', 'tenancy', 'Create workspace', 'Create workspace', ['WORKSPACES_CREATE'], R.MED, 'workspacesCreateInput'],
  ['org.get', 'tenancy', 'Get organization', 'Get organization', ['ORG_VIEW'], R.READ, 'orgGetInput'],
  ['org.theme.update', 'tenancy', 'Update theme', 'Update org theme', ['ORG_BRANDING_MANAGE'], R.MED, 'orgThemeUpdateInput'],
  ['billing.plans.list', 'billing', 'List plans', 'List billing plans', ['ORG_BILLING_MANAGE'], R.READ, 'billingPlansListInput'],
  ['billing.subscription.get', 'billing', 'Get subscription', 'Get org subscription', ['ORG_BILLING_MANAGE'], R.READ, 'billingSubscriptionGetInput'],
  ['agents.definitions.list', 'agent', 'List agent definitions', 'List custom agents', ['AI_AGENTS_MANAGE'], R.READ, 'agentDefinitionsListInput'],
  ['agents.definitions.create', 'agent', 'Create agent definition', 'Create custom agent', ['AI_AGENTS_MANAGE'], R.HIGH, 'agentDefinitionCreateInput', true],
  ['agents.schedules.list', 'agent', 'List agent schedules', 'List agent schedules', ['AI_AGENTS_MANAGE'], R.READ, 'agentSchedulesListInput'],
  ['agents.schedules.create', 'agent', 'Create agent schedule', 'Create agent schedule', ['AI_AGENTS_MANAGE'], R.HIGH, 'agentScheduleCreateInput', true],
];

const schemaImports = [...new Set(tools.map((t) => t[6]))].sort();

let out = `import { Permissions } from '../auth/permissions.js';
import {
  ${schemaImports.join(',\n  ')},
} from './schemas.js';
import {
  CapabilityRiskTiers,
  type CapabilityDefinition,
} from './types.js';

function t(
  id: string,
  module: CapabilityDefinition['module'],
  name: string,
  description: string,
  permissions: CapabilityDefinition['permissions'],
  riskTier: CapabilityDefinition['riskTier'],
  inputSchema: CapabilityDefinition['inputSchema'],
  requiresConfirmation?: boolean,
): CapabilityDefinition {
  return {
    id,
    module,
    name,
    description,
    permissions,
    riskTier,
    inputSchema,
    ...(requiresConfirmation ? { requiresConfirmation: true } : {}),
  };
}

/** Single source of truth for agent, automation, and MCP tools (~${tools.length}). */
export const CAPABILITY_CATALOG: readonly CapabilityDefinition[] = [
`;

for (const row of tools) {
  const [id, mod, name, desc, perms, risk, schema, confirm] = row;
  const permsLit = perms.map((p) => `Permissions.${p}`).join(', ');
  out += `  t('${id}', '${mod}', '${name}', '${desc}', [${permsLit}], ${risk}, ${schema}${confirm ? ', true' : ''}),\n`;
}

out += `];

export const CAPABILITY_BY_ID = new Map(
  CAPABILITY_CATALOG.map((c) => [c.id, c]),
);

export function capabilityRequiresConfirmation(
  def: CapabilityDefinition,
): boolean {
  return (
    def.requiresConfirmation === true ||
    def.riskTier === CapabilityRiskTiers.WRITE_HIGH
  );
}
`;

fs.writeFileSync('packages/contracts/src/capabilities/catalog.ts', out);
console.log(`Wrote ${tools.length} tools`);
