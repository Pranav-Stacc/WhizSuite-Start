import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

const createDepartmentFormSchema = z.object({
  name: z.string().min(2),
  parentId: z.string().optional(),
});
import {
  brandKitSchema,
  connectIntegrationSchema,
  createArticleSchema,
  createAssetSchema,
  createAutomationSchema,
  createClientSchema,
  createContentSchema,
  createLeadSchema,
  createProjectSchema,
  createTaskSchema,
  createWorkflowSchema,
  inviteMemberSchema,
  logTimeSchema,
  messageSchema,
  scheduleSchema,
  updateProfileSchema,
} from '@agency-os/contracts';

/**
 * Registry of contract schemas that client forms may reference by key.
 * Server actions re-validate with the very same schema, so the rules cannot drift.
 */
export const FORM_SCHEMAS = {
  client: createClientSchema,
  brandKit: brandKitSchema,
  project: createProjectSchema,
  task: createTaskSchema,
  content: createContentSchema,
  lead: createLeadSchema,
  invite: inviteMemberSchema,
  time: logTimeSchema,
  automation: createAutomationSchema,
  schedule: scheduleSchema,
  article: createArticleSchema,
  profile: updateProfileSchema,
  asset: createAssetSchema,
  message: messageSchema,
  workflow: createWorkflowSchema,
  integration: connectIntegrationSchema,
  department: createDepartmentFormSchema,
} satisfies Record<string, ZodTypeAny>;

export type FormSchemaKey = keyof typeof FORM_SCHEMAS;
