export const Visibilities = ['INTERNAL', 'CLIENT_VISIBLE'] as const;
export type Visibility = (typeof Visibilities)[number];

export const CalendarSourceTypes = ['MANUAL', 'CONTENT', 'TASK', 'MEETING', 'DEADLINE'] as const;
export type CalendarSourceType = (typeof CalendarSourceTypes)[number];

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

export const ApprovalStepRules = ['ANY', 'ALL'] as const;
export type ApprovalStepRule = (typeof ApprovalStepRules)[number];

export const RESOURCE_NAME_MAX_LENGTH = 200;
export const RESOURCE_KEY_MAX_LENGTH = 100;
export const RESOURCE_TEXT_MAX_LENGTH = 2000;
export const APPROVAL_STEPS_MAX = 10;
