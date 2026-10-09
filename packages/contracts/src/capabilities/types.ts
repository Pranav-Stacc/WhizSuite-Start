import type { z } from 'zod';
import type { Permission } from '../auth/permissions.js';

/** How dangerous a tool is — drives confirmation policy. */
export const CapabilityRiskTiers = {
  READ: 'read',
  WRITE_LOW: 'write_low',
  WRITE_MEDIUM: 'write_medium',
  WRITE_HIGH: 'write_high',
} as const;

export type CapabilityRiskTier =
  (typeof CapabilityRiskTiers)[keyof typeof CapabilityRiskTiers];

export const CapabilityModules = [
  'clients',
  'crm',
  'work',
  'content',
  'calendar',
  'chat',
  'media',
  'approvals',
  'finance',
  'time',
  'notifications',
  'automations',
  'workflows',
  'knowledge',
  'integrations',
  'feedback',
  'reporting',
  'analytics',
  'audit',
  'identity',
  'access',
  'tenancy',
  'billing',
  'search',
  'intelligence',
  'agent',
] as const;

export type CapabilityModule = (typeof CapabilityModules)[number];

export interface CapabilityDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  module: CapabilityModule;
  name: string;
  description: string;
  permissions: readonly Permission[];
  riskTier: CapabilityRiskTier;
  inputSchema: T;
  /** When true, user must confirm before execution (unless org policy allows auto). */
  requiresConfirmation?: boolean;
}

export interface CapabilityToolDescriptor {
  id: string;
  module: CapabilityModule;
  name: string;
  description: string;
  riskTier: CapabilityRiskTier;
  requiresConfirmation: boolean;
  inputSchema: Record<string, unknown>;
}

export interface CapabilityExecuteRequest {
  toolId: string;
  input: Record<string, unknown>;
  /** Present when resuming a pending confirmation. */
  pendingActionId?: string;
  idempotencyKey?: string;
}

export interface CapabilityExecuteResult {
  status: 'ok' | 'pending_confirmation' | 'error';
  output?: unknown;
  pendingActionId?: string;
  message?: string;
}
