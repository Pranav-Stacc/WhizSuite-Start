// GENERATED CODE - DO NOT MODIFY BY HAND.
// Source: packages/contracts. Regenerate with `pnpm --filter @agency-os/contracts generate:dart`.
// ignore_for_file: constant_identifier_names

abstract final class Permissions {
  static const String orgView = 'org.view';
  static const String orgSettingsManage = 'org.settings.manage';
  static const String orgBillingManage = 'org.billing.manage';
  static const String orgBrandingManage = 'org.branding.manage';
  static const String membersView = 'members.view';
  static const String membersInvite = 'members.invite';
  static const String membersEdit = 'members.edit';
  static const String membersDeactivate = 'members.deactivate';
  static const String rolesManage = 'roles.manage';
  static const String workspacesView = 'workspaces.view';
  static const String workspacesCreate = 'workspaces.create';
  static const String workspacesManage = 'workspaces.manage';
  static const String clientsView = 'clients.view';
  static const String clientsCreate = 'clients.create';
  static const String clientsEdit = 'clients.edit';
  static const String clientsDelete = 'clients.delete';
  static const String leadsView = 'leads.view';
  static const String leadsCreate = 'leads.create';
  static const String leadsConvert = 'leads.convert';
  static const String projectsView = 'projects.view';
  static const String projectsCreate = 'projects.create';
  static const String projectsEdit = 'projects.edit';
  static const String projectsDelete = 'projects.delete';
  static const String tasksView = 'tasks.view';
  static const String tasksCreate = 'tasks.create';
  static const String tasksAssign = 'tasks.assign';
  static const String tasksEdit = 'tasks.edit';
  static const String tasksDelete = 'tasks.delete';
  static const String tasksTransition = 'tasks.transition';
  static const String contentView = 'content.view';
  static const String contentCreate = 'content.create';
  static const String contentEdit = 'content.edit';
  static const String contentDelete = 'content.delete';
  static const String socialSchedule = 'social.schedule';
  static const String socialPublish = 'social.publish';
  static const String approvalsView = 'approvals.view';
  static const String approvalsCreate = 'approvals.create';
  static const String approvalsApprove = 'approvals.approve';
  static const String feedbackView = 'feedback.view';
  static const String feedbackCreate = 'feedback.create';
  static const String feedbackResolve = 'feedback.resolve';
  static const String filesView = 'files.view';
  static const String filesUpload = 'files.upload';
  static const String filesDelete = 'files.delete';
  static const String chatView = 'chat.view';
  static const String chatSend = 'chat.send';
  static const String chatCreateRoom = 'chat.create_room';
  static const String chatManage = 'chat.manage';
  static const String workflowsManage = 'workflows.manage';
  static const String automationsManage = 'automations.manage';
  static const String reportsView = 'reports.view';
  static const String invoicesView = 'invoices.view';
  static const String invoicesCreate = 'invoices.create';
  static const String timeTrack = 'time.track';
  static const String auditView = 'audit.view';
  static const String integrationsManage = 'integrations.manage';

  static const List<String> values = <String>[orgView, orgSettingsManage, orgBillingManage, orgBrandingManage, membersView, membersInvite, membersEdit, membersDeactivate, rolesManage, workspacesView, workspacesCreate, workspacesManage, clientsView, clientsCreate, clientsEdit, clientsDelete, leadsView, leadsCreate, leadsConvert, projectsView, projectsCreate, projectsEdit, projectsDelete, tasksView, tasksCreate, tasksAssign, tasksEdit, tasksDelete, tasksTransition, contentView, contentCreate, contentEdit, contentDelete, socialSchedule, socialPublish, approvalsView, approvalsCreate, approvalsApprove, feedbackView, feedbackCreate, feedbackResolve, filesView, filesUpload, filesDelete, chatView, chatSend, chatCreateRoom, chatManage, workflowsManage, automationsManage, reportsView, invoicesView, invoicesCreate, timeTrack, auditView, integrationsManage];
}

abstract final class ScopeTypes {
  static const String global = 'GLOBAL';
  static const String organization = 'ORGANIZATION';
  static const String workspace = 'WORKSPACE';
  static const String department = 'DEPARTMENT';
  static const String team = 'TEAM';
  static const String client = 'CLIENT';
  static const String project = 'PROJECT';
  static const String task = 'TASK';
  static const String content = 'CONTENT';
  static const String self = 'SELF';

  static const List<String> values = <String>[global, organization, workspace, department, team, client, project, task, content, self];
}

abstract final class AssignableScopeTypes {
  static const String organization = 'ORGANIZATION';
  static const String workspace = 'WORKSPACE';
  static const String department = 'DEPARTMENT';
  static const String team = 'TEAM';
  static const String client = 'CLIENT';
  static const String project = 'PROJECT';
  static const String task = 'TASK';
  static const String content = 'CONTENT';
  static const String self = 'SELF';

  static const List<String> values = <String>[organization, workspace, department, team, client, project, task, content, self];
}

abstract final class RoleKinds {
  static const String access = 'ACCESS';
  static const String workflow = 'WORKFLOW';

  static const List<String> values = <String>[access, workflow];
}

abstract final class MembershipTypes {
  static const String owner = 'OWNER';
  static const String admin = 'ADMIN';
  static const String member = 'MEMBER';
  static const String client = 'CLIENT';

  static const List<String> values = <String>[owner, admin, member, client];
}

abstract final class ErrorCodes {
  static const String validationFailed = 'VALIDATION_FAILED';
  static const String unauthorized = 'UNAUTHORIZED';
  static const String forbidden = 'FORBIDDEN';
  static const String notFound = 'NOT_FOUND';
  static const String conflict = 'CONFLICT';
  static const String rateLimited = 'RATE_LIMITED';
  static const String idempotencyReplay = 'IDEMPOTENCY_REPLAY';
  static const String tenantRequired = 'TENANT_REQUIRED';
  static const String tenantMismatch = 'TENANT_MISMATCH';
  static const String invalidCredentials = 'INVALID_CREDENTIALS';
  static const String googleAuthDisabled = 'GOOGLE_AUTH_DISABLED';
  static const String googleTokenInvalid = 'GOOGLE_TOKEN_INVALID';
  static const String accountNotFound = 'ACCOUNT_NOT_FOUND';
  static const String sessionExpired = 'SESSION_EXPIRED';
  static const String tokenReuseDetected = 'TOKEN_REUSE_DETECTED';
  static const String invitationExpired = 'INVITATION_EXPIRED';
  static const String invitationRevoked = 'INVITATION_REVOKED';
  static const String seatLimitExceeded = 'SEAT_LIMIT_EXCEEDED';
  static const String entitlementDenied = 'ENTITLEMENT_DENIED';
  static const String workflowGuardFailed = 'WORKFLOW_GUARD_FAILED';
  static const String approvalStale = 'APPROVAL_STALE';
  static const String publishFailed = 'PUBLISH_FAILED';
  static const String socialAccountDisconnected = 'SOCIAL_ACCOUNT_DISCONNECTED';
  static const String mediaTypeNotAllowed = 'MEDIA_TYPE_NOT_ALLOWED';
  static const String mediaTooLarge = 'MEDIA_TOO_LARGE';
  static const String mediaUploadIncomplete = 'MEDIA_UPLOAD_INCOMPLETE';
  static const String mediaNotReady = 'MEDIA_NOT_READY';
  static const String contentVersionConflict = 'CONTENT_VERSION_CONFLICT';
  static const String internalError = 'INTERNAL_ERROR';

  static const List<String> values = <String>[validationFailed, unauthorized, forbidden, notFound, conflict, rateLimited, idempotencyReplay, tenantRequired, tenantMismatch, invalidCredentials, googleAuthDisabled, googleTokenInvalid, accountNotFound, sessionExpired, tokenReuseDetected, invitationExpired, invitationRevoked, seatLimitExceeded, entitlementDenied, workflowGuardFailed, approvalStale, publishFailed, socialAccountDisconnected, mediaTypeNotAllowed, mediaTooLarge, mediaUploadIncomplete, mediaNotReady, contentVersionConflict, internalError];
}

abstract final class NotificationTypeKeys {
  static const String taskAssigned = 'task.assigned';
  static const String taskStateChanged = 'task.state_changed';
  static const String taskCommented = 'task.commented';
  static const String taskDueSoon = 'task.due_soon';
  static const String taskOverdue = 'task.overdue';
  static const String contentApproved = 'content.approved';
  static const String contentChangesRequested = 'content.changes_requested';
  static const String approvalRequested = 'approval.requested';
  static const String chatMessage = 'chat.message';
  static const String chatMention = 'chat.mention';

  static const List<String> values = <String>[taskAssigned, taskStateChanged, taskCommented, taskDueSoon, taskOverdue, contentApproved, contentChangesRequested, approvalRequested, chatMessage, chatMention];
}

abstract final class NotificationChannels {
  static const String inApp = 'inApp';
  static const String email = 'email';
  static const String push = 'push';

  static const List<String> values = <String>[inApp, email, push];
}

abstract final class DevicePlatforms {
  static const String android = 'ANDROID';
  static const String ios = 'IOS';
  static const String web = 'WEB';

  static const List<String> values = <String>[android, ios, web];
}

abstract final class RealtimeEvents {
  static const String connected = 'connected';
  static const String pong = 'pong';
  static const String notificationCreated = 'notification.created';
  static const String chatMessageCreated = 'chat.message.created';
  static const String chatMessageUpdated = 'chat.message.updated';
  static const String chatMessageDeleted = 'chat.message.deleted';
  static const String chatRoomUpdated = 'chat.room.updated';
  static const String chatTyping = 'chat.typing';
  static const String chatRead = 'chat.read';

  static const List<String> values = <String>[connected, pong, notificationCreated, chatMessageCreated, chatMessageUpdated, chatMessageDeleted, chatRoomUpdated, chatTyping, chatRead];
}

const String realtimeNamespace = '/realtime';

const int deviceTokenMaxLength = 4096;

const int deviceMetaMaxLength = 50;

const int passwordMinLength = 12;

const int organizationNameMinLength = 2;

const String organizationSlugPattern = '^[a-z0-9-]+\$';

const int profileNameMaxLength = 100;

const int profileJobTitleMaxLength = 120;

abstract final class TaskStatuses {
  static const String todo = 'TODO';
  static const String inProgress = 'IN_PROGRESS';
  static const String inReview = 'IN_REVIEW';
  static const String done = 'DONE';

  static const List<String> values = <String>[todo, inProgress, inReview, done];
}

abstract final class Priorities {
  static const String low = 'LOW';
  static const String medium = 'MEDIUM';
  static const String high = 'HIGH';
  static const String urgent = 'URGENT';

  static const List<String> values = <String>[low, medium, high, urgent];
}

abstract final class ContentStatuses {
  static const String draft = 'DRAFT';
  static const String inReview = 'IN_REVIEW';
  static const String changesRequested = 'CHANGES_REQUESTED';
  static const String approved = 'APPROVED';
  static const String scheduled = 'SCHEDULED';
  static const String published = 'PUBLISHED';

  static const List<String> values = <String>[draft, inReview, changesRequested, approved, scheduled, published];
}

abstract final class ContentTypes {
  static const String post = 'POST';
  static const String carousel = 'CAROUSEL';
  static const String reel = 'REEL';
  static const String story = 'STORY';
  static const String video = 'VIDEO';
  static const String article = 'ARTICLE';

  static const List<String> values = <String>[post, carousel, reel, story, video, article];
}

abstract final class Platforms {
  static const String instagram = 'instagram';
  static const String facebook = 'facebook';
  static const String linkedin = 'linkedin';
  static const String x = 'x';
  static const String youtube = 'youtube';
  static const String tiktok = 'tiktok';

  static const List<String> values = <String>[instagram, facebook, linkedin, x, youtube, tiktok];
}

abstract final class ClientStatuses {
  static const String onboarding = 'ONBOARDING';
  static const String active = 'ACTIVE';
  static const String paused = 'PAUSED';
  static const String churned = 'CHURNED';

  static const List<String> values = <String>[onboarding, active, paused, churned];
}

abstract final class ProjectStatuses {
  static const String planning = 'PLANNING';
  static const String active = 'ACTIVE';
  static const String onHold = 'ON_HOLD';
  static const String completed = 'COMPLETED';

  static const List<String> values = <String>[planning, active, onHold, completed];
}

abstract final class InvoiceStatuses {
  static const String draft = 'DRAFT';
  static const String sent = 'SENT';
  static const String paid = 'PAID';
  static const String overdue = 'OVERDUE';
  static const String voidValue = 'VOID';

  static const List<String> values = <String>[draft, sent, paid, overdue, voidValue];
}

abstract final class ApprovalStatuses {
  static const String pending = 'PENDING';
  static const String approved = 'APPROVED';
  static const String rejected = 'REJECTED';
  static const String changesRequested = 'CHANGES_REQUESTED';

  static const List<String> values = <String>[pending, approved, rejected, changesRequested];
}

abstract final class ApprovalActions {
  static const String approved = 'APPROVED';
  static const String rejected = 'REJECTED';
  static const String changesRequested = 'CHANGES_REQUESTED';

  static const List<String> values = <String>[approved, rejected, changesRequested];
}

abstract final class AutomationTriggers {
  static const String contentSubmitted = 'content.submitted';
  static const String contentApproved = 'content.approved';
  static const String contentPublished = 'content.published';
  static const String taskOverdue = 'task.overdue';
  static const String invoiceOverdue = 'invoice.overdue';
  static const String leadWon = 'lead.won';
  static const String chatMessageMentioned = 'chat.message_mentioned';

  static const List<String> values = <String>[contentSubmitted, contentApproved, contentPublished, taskOverdue, invoiceOverdue, leadWon, chatMessageMentioned];
}

abstract final class AutomationActions {
  static const String notifyClient = 'notify.client';
  static const String notifyTeam = 'notify.team';
  static const String createTask = 'create.task';
  static const String sendEmail = 'send.email';
  static const String postWebhook = 'post.webhook';

  static const List<String> values = <String>[notifyClient, notifyTeam, createTask, sendEmail, postWebhook];
}

abstract final class ThemeDensities {
  static const String comfortable = 'comfortable';
  static const String compact = 'compact';

  static const List<String> values = <String>[comfortable, compact];
}

abstract final class ThemeColorKeys {
  static const String primary = 'primary';
  static const String secondary = 'secondary';
  static const String bg = 'bg';
  static const String surface = 'surface';
  static const String border = 'border';
  static const String fg = 'fg';
  static const String muted = 'muted';

  static const List<String> values = <String>[primary, secondary, bg, surface, border, fg, muted];
}

const int themeRadiusMin = 0;

const int themeRadiusMax = 28;

const double themeCompactDensityFactor = 0.86;

const double themeLightLuminanceThreshold = 0.35;

const String themeContrastDark = '#04110A';

const String themeContrastLight = '#FFFFFF';

abstract final class ThemeStatusColors {
  static const String success = '#4F8A65';
  static const String warning = '#C08A3E';
  static const String danger = '#BF5148';
  static const String info = '#5A7FAE';
  static const String violet = '#8A7AB4';
  static const String pink = '#BE7896';

  static const List<String> values = <String>[success, warning, danger, info, violet, pink];
}

const Map<String, Object> defaultTheme = <String, Object>{'bg': '#F7F6F3', 'surface': '#FFFFFF', 'border': '#D8D5CE', 'primary': '#111111', 'secondary': '#5C5A55', 'fg': '#111111', 'muted': '#8A877F', 'radius': 2, 'density': 'comfortable'};

const List<Object> themePresets = <Object>[<String, Object>{'id': 'editorial', 'mode': 'light', 'theme': <String, Object>{'bg': '#F7F6F3', 'surface': '#FFFFFF', 'border': '#D8D5CE', 'primary': '#111111', 'secondary': '#5C5A55', 'fg': '#111111', 'muted': '#8A877F', 'radius': 2, 'density': 'comfortable'}}, <String, Object>{'id': 'chalk', 'mode': 'light', 'theme': <String, Object>{'bg': '#F4F4F5', 'surface': '#FFFFFF', 'border': '#D4D4D8', 'primary': '#18181B', 'secondary': '#52525B', 'fg': '#18181B', 'muted': '#71717A', 'radius': 4, 'density': 'comfortable'}}, <String, Object>{'id': 'porcelain', 'mode': 'light', 'theme': <String, Object>{'bg': '#F8FAFC', 'surface': '#FFFFFF', 'border': '#D0D7E2', 'primary': '#0F172A', 'secondary': '#334155', 'fg': '#0F172A', 'muted': '#64748B', 'radius': 6, 'density': 'comfortable'}}, <String, Object>{'id': 'mist', 'mode': 'light', 'theme': <String, Object>{'bg': '#F0F4F8', 'surface': '#FFFFFF', 'border': '#C5D4E0', 'primary': '#1E3A5F', 'secondary': '#3D6B8F', 'fg': '#152536', 'muted': '#5E7388', 'radius': 6, 'density': 'comfortable'}}, <String, Object>{'id': 'daylight', 'mode': 'light', 'theme': <String, Object>{'bg': '#F4F7F5', 'surface': '#FFFFFF', 'border': '#CFE0D6', 'primary': '#0A9F4F', 'secondary': '#0F7A5A', 'fg': '#0B1513', 'muted': '#5D6B67', 'radius': 14, 'density': 'comfortable'}}, <String, Object>{'id': 'sage', 'mode': 'light', 'theme': <String, Object>{'bg': '#F3F5F1', 'surface': '#FBFCF9', 'border': '#CDD5C8', 'primary': '#3F5A45', 'secondary': '#6B8570', 'fg': '#1C241E', 'muted': '#6E7A70', 'radius': 8, 'density': 'comfortable'}}, <String, Object>{'id': 'sky', 'mode': 'light', 'theme': <String, Object>{'bg': '#F3F8FC', 'surface': '#FFFFFF', 'border': '#C5D9EB', 'primary': '#0369A1', 'secondary': '#0E7490', 'fg': '#0C1929', 'muted': '#5B738A', 'radius': 10, 'density': 'comfortable'}}, <String, Object>{'id': 'linen', 'mode': 'light', 'theme': <String, Object>{'bg': '#F6F3EE', 'surface': '#FFFDF9', 'border': '#DDD5C8', 'primary': '#2C2A26', 'secondary': '#6B6560', 'fg': '#1F1D1A', 'muted': '#7A746C', 'radius': 2, 'density': 'comfortable'}}, <String, Object>{'id': 'noir', 'mode': 'dark', 'theme': <String, Object>{'bg': '#0E0E0D', 'surface': '#161615', 'border': '#2E2D2A', 'primary': '#F2F0EB', 'secondary': '#B8B5AE', 'fg': '#F2F0EB', 'muted': '#8C8A85', 'radius': 2, 'density': 'comfortable'}}, <String, Object>{'id': 'mono', 'mode': 'dark', 'theme': <String, Object>{'bg': '#040109', 'surface': '#0B0B0B', 'border': '#2A2A2A', 'primary': '#FFFFFF', 'secondary': '#D1D1D1', 'fg': '#FFFFFF', 'muted': '#8D9B98', 'radius': 14, 'density': 'comfortable'}}, <String, Object>{'id': 'aurora', 'mode': 'dark', 'theme': <String, Object>{'bg': '#07050F', 'surface': '#110D1F', 'border': '#2C2150', 'primary': '#A78BFA', 'secondary': '#7DD3FC', 'fg': '#F6F5FF', 'muted': '#9A96B5', 'radius': 14, 'density': 'comfortable'}}, <String, Object>{'id': 'ocean', 'mode': 'dark', 'theme': <String, Object>{'bg': '#030B12', 'surface': '#0A1823', 'border': '#17344A', 'primary': '#38BDF8', 'secondary': '#22D3EE', 'fg': '#F2F8FC', 'muted': '#8CA3B3', 'radius': 14, 'density': 'comfortable'}}, <String, Object>{'id': 'sunset', 'mode': 'dark', 'theme': <String, Object>{'bg': '#0D0705', 'surface': '#1A100C', 'border': '#4A2A1A', 'primary': '#FF8A3D', 'secondary': '#FFC247', 'fg': '#FFF7F0', 'muted': '#B09A8A', 'radius': 14, 'density': 'comfortable'}}, <String, Object>{'id': 'rose', 'mode': 'dark', 'theme': <String, Object>{'bg': '#0D0509', 'surface': '#1A0C13', 'border': '#4A1A2F', 'primary': '#FF4D8D', 'secondary': '#FF9AC1', 'fg': '#FFF4F8', 'muted': '#B18C9C', 'radius': 14, 'density': 'comfortable'}}];

abstract final class LeadStages {
  static const String newValue = 'NEW';
  static const String contacted = 'CONTACTED';
  static const String proposal = 'PROPOSAL';
  static const String negotiation = 'NEGOTIATION';
  static const String won = 'WON';
  static const String lost = 'LOST';

  static const List<String> values = <String>[newValue, contacted, proposal, negotiation, won, lost];
}

abstract final class ArticleCategories {
  static const String sop = 'SOP';
  static const String playbook = 'PLAYBOOK';
  static const String template = 'TEMPLATE';
  static const String policy = 'POLICY';
  static const String onboarding = 'ONBOARDING';

  static const List<String> values = <String>[sop, playbook, template, policy, onboarding];
}

abstract final class AssetKinds {
  static const String image = 'image';
  static const String video = 'video';
  static const String document = 'document';

  static const List<String> values = <String>[image, video, document];
}

abstract final class MediaAssetStatuses {
  static const String pendingUpload = 'PENDING_UPLOAD';
  static const String ready = 'READY';
  static const String failed = 'FAILED';

  static const List<String> values = <String>[pendingUpload, ready, failed];
}

abstract final class Visibilities {
  static const String internal = 'INTERNAL';
  static const String clientVisible = 'CLIENT_VISIBLE';

  static const List<String> values = <String>[internal, clientVisible];
}

abstract final class CalendarSourceTypes {
  static const String manual = 'MANUAL';
  static const String content = 'CONTENT';
  static const String task = 'TASK';
  static const String meeting = 'MEETING';
  static const String deadline = 'DEADLINE';
  static const String shoot = 'SHOOT';
  static const String approval = 'APPROVAL';
  static const String campaign = 'CAMPAIGN';
  static const String invoice = 'INVOICE';
  static const String milestone = 'MILESTONE';

  static const List<String> values = <String>[manual, content, task, meeting, deadline, shoot, approval, campaign, invoice, milestone];
}

abstract final class CustomFieldEntityTypes {
  static const String client = 'client';
  static const String project = 'project';
  static const String task = 'task';
  static const String content = 'content';
  static const String lead = 'lead';

  static const List<String> values = <String>[client, project, task, content, lead];
}

abstract final class CustomFieldTypes {
  static const String text = 'TEXT';
  static const String number = 'NUMBER';
  static const String date = 'DATE';
  static const String select = 'SELECT';
  static const String multiSelect = 'MULTI_SELECT';
  static const String boolean = 'BOOLEAN';
  static const String url = 'URL';

  static const List<String> values = <String>[text, number, date, select, multiSelect, boolean, url];
}

abstract final class ReportStatuses {
  static const String draft = 'DRAFT';
  static const String ready = 'READY';
  static const String sent = 'SENT';

  static const List<String> values = <String>[draft, ready, sent];
}

abstract final class TemplateTypes {
  static const String project = 'PROJECT';
  static const String task = 'TASK';
  static const String content = 'CONTENT';
  static const String report = 'REPORT';
  static const String message = 'MESSAGE';

  static const List<String> values = <String>[project, task, content, report, message];
}

abstract final class TemplateScopes {
  static const String organization = 'ORGANIZATION';
  static const String client = 'CLIENT';

  static const List<String> values = <String>[organization, client];
}

abstract final class IntegrationConnectionStatuses {
  static const String pending = 'PENDING';
  static const String connected = 'CONNECTED';
  static const String disconnected = 'DISCONNECTED';
  static const String error = 'ERROR';

  static const List<String> values = <String>[pending, connected, disconnected, error];
}

abstract final class FeedbackThreadStatuses {
  static const String open = 'OPEN';
  static const String resolved = 'RESOLVED';

  static const List<String> values = <String>[open, resolved];
}

abstract final class FeedbackSubjectTypes {
  static const String content = 'CONTENT';
  static const String client = 'CLIENT';

  static const List<String> values = <String>[content, client];
}

abstract final class ApprovalStepRules {
  static const String any = 'ANY';
  static const String all = 'ALL';
  static const String quorum = 'QUORUM';

  static const List<String> values = <String>[any, all, quorum];
}

abstract final class ApiContentTypes {
  static const String staticPost = 'STATIC_POST';
  static const String reel = 'REEL';
  static const String story = 'STORY';
  static const String carousel = 'CAROUSEL';
  static const String video = 'VIDEO';
  static const String article = 'ARTICLE';

  static const List<String> values = <String>[staticPost, reel, story, carousel, video, article];
}

abstract final class ContentCreatableStatuses {
  static const String draft = 'DRAFT';
  static const String inReview = 'IN_REVIEW';

  static const List<String> values = <String>[draft, inReview];
}

abstract final class ContentReviewOutcomes {
  static const String approved = 'APPROVED';
  static const String changesRequested = 'CHANGES_REQUESTED';
  static const String draft = 'DRAFT';

  static const List<String> values = <String>[approved, changesRequested, draft];
}

const Map<String, List<String>> contentTransitions = <String, List<String>>{
  'DRAFT': <String>['IN_REVIEW'],
  'IN_REVIEW': <String>['APPROVED', 'CHANGES_REQUESTED', 'DRAFT'],
  'CHANGES_REQUESTED': <String>['DRAFT', 'IN_REVIEW'],
  'APPROVED': <String>['SCHEDULED', 'PUBLISHED', 'DRAFT'],
  'SCHEDULED': <String>['APPROVED', 'PUBLISHED', 'DRAFT'],
  'PUBLISHED': <String>[],
};

abstract final class InvoiceCreatableStatuses {
  static const String draft = 'DRAFT';
  static const String sent = 'SENT';

  static const List<String> values = <String>[draft, sent];
}

const Map<String, List<String>> invoiceTransitions = <String, List<String>>{
  'DRAFT': <String>['SENT', 'VOID'],
  'SENT': <String>['PAID', 'VOID'],
  'OVERDUE': <String>['PAID', 'VOID'],
  'PAID': <String>[],
  'VOID': <String>[],
};

abstract final class ChatRoomTypes {
  static const String dm = 'DM';
  static const String group = 'GROUP';
  static const String client = 'CLIENT';

  static const List<String> values = <String>[dm, group, client];
}

abstract final class ChatMemberRoles {
  static const String owner = 'OWNER';
  static const String admin = 'ADMIN';
  static const String member = 'MEMBER';
  static const String guest = 'GUEST';

  static const List<String> values = <String>[owner, admin, member, guest];
}

abstract final class ChatMentionTypes {
  static const String user = 'USER';
  static const String client = 'CLIENT';
  static const String task = 'TASK';
  static const String project = 'PROJECT';
  static const String content = 'CONTENT';
  static const String calendarEvent = 'CALENDAR_EVENT';
  static const String lead = 'LEAD';

  static const List<String> values = <String>[user, client, task, project, content, calendarEvent, lead];
}

abstract final class ChatMessageTypes {
  static const String text = 'TEXT';
  static const String system = 'SYSTEM';
  static const String media = 'MEDIA';

  static const List<String> values = <String>[text, system, media];
}

abstract final class ChatAttachmentKinds {
  static const String image = 'IMAGE';
  static const String video = 'VIDEO';
  static const String audio = 'AUDIO';
  static const String file = 'FILE';
  static const String link = 'LINK';

  static const List<String> values = <String>[image, video, audio, file, link];
}

abstract final class ChatNotificationLevels {
  static const String all = 'ALL';
  static const String mentions = 'MENTIONS';
  static const String none = 'NONE';

  static const List<String> values = <String>[all, mentions, none];
}

const int resourceNameMinLength = 2;

const int resourceNameMaxLength = 200;

const int resourceKeyMaxLength = 100;

const int resourceTextMaxLength = 2000;

const int approvalStepsMax = 10;

const int projectNameMaxLength = 200;

const int projectTypeMaxLength = 60;

const int contentTitleMaxLength = 200;

const int contentCaptionMaxLength = 5000;

const int contentPillarMaxLength = 100;

const int contentHashtagMaxLength = 100;

const int contentCtaUrlMaxLength = 2048;

const int contentHashtagsMaxDefault = 30;

const String hashtagPattern = '^#?[^\\s#]+\$';

const int invoiceNumberMaxLength = 40;

const int invoiceLinesMaxDefault = 100;

const int invoiceLineDescriptionMaxLength = 500;

const int invoiceLineQuantityMax = 100000;

const int invoiceTaxRateMax = 100;

const int basisPointsPerPercent = 100;

const int leadTextMaxLength = 200;

const int leadNextStepMaxLength = 500;

const int articleTitleMaxLength = 200;

const int articleBodyMaxLength = 50000;

const int timeEntryMinutesMax = 1440;

const int timeEntryNoteMaxLength = 1000;

const int chatMessageMaxLength = 10000;

const int chatRoomNameMaxLength = 120;

const int chatPreviewMaxLength = 280;

const int chatMessagesPageMax = 100;

const int chatRoomsPageMax = 100;

const int feedbackCommentMaxLengthDefault = 2000;

const int mediaFilenameMaxLength = 255;

const int roleNameMaxLength = 60;

const int roleDescriptionMaxLength = 280;

const int memberRolesMax = 10;

const String workflowStageSeparator = ',';

const int minWorkflowStages = 2;

const int maxWorkflowStages = 20;

const int maxWorkflowSlaHours = 720;

const int maxWorkflowStageLength = 80;

const int maxAutomationRunDetailLength = 500;
