export const UserRoles = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CREATOR: 'creator',
  CLIENT: 'client',
} as const;
export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const TaskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TaskStatuses)[number];

export const Priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof Priorities)[number];

export const ContentStatuses = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
] as const;
export type ContentStatus = (typeof ContentStatuses)[number];

export const ContentTypes = ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO', 'ARTICLE'] as const;
export type ContentType = (typeof ContentTypes)[number];

export const Platforms = ['instagram', 'facebook', 'linkedin', 'x', 'youtube', 'tiktok'] as const;
export type Platform = (typeof Platforms)[number];

export const ClientStatuses = ['ONBOARDING', 'ACTIVE', 'PAUSED', 'CHURNED'] as const;
export type ClientStatus = (typeof ClientStatuses)[number];

export const ProjectStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
export type ProjectStatus = (typeof ProjectStatuses)[number];

export const InvoiceStatuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'] as const;
export type InvoiceStatus = (typeof InvoiceStatuses)[number];

export const ApprovalStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const;
export type ApprovalStatus = (typeof ApprovalStatuses)[number];

export const ApprovalActions = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const;
export type ApprovalAction = (typeof ApprovalActions)[number];

export const AutomationTriggers = ['content.submitted', 'content.approved', 'content.published', 'task.overdue', 'invoice.overdue', 'lead.won', 'inbox.negative'] as const;
export type AutomationTrigger = (typeof AutomationTriggers)[number];

export const AutomationActions = ['notify.client', 'notify.team', 'create.task', 'send.email', 'post.webhook'] as const;
export type AutomationAction = (typeof AutomationActions)[number];

export const MembershipTypes = ['OWNER', 'ADMIN', 'MEMBER', 'CLIENT'] as const;
export type MembershipType = (typeof MembershipTypes)[number];
