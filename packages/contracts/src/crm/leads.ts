/** Stages of the default sales pipeline, in order; the API provisions them per organization. */
export const LeadStages = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type LeadStage = (typeof LeadStages)[number];

export const LEAD_LIST_LIMIT_DEFAULT = 500;
export const LEAD_TEXT_MAX_LENGTH = 200;
export const LEAD_NEXT_STEP_MAX_LENGTH = 500;

export interface LeadCreateInput {
  companyName: string;
  brandName?: string;
  website?: string;
  industry?: string;
  source?: string;
  stage?: LeadStage;
  valueMinor?: number;
  ownerId?: string;
  contactName?: string;
  contactEmail?: string;
  nextStep?: string;
  nextStepAt?: string;
}

export interface LeadUpdateInput extends Partial<LeadCreateInput> {
  convertedClientId?: string;
}

export interface LeadDto {
  id: string;
  companyName: string;
  brandName: string | null;
  website: string | null;
  industry: string | null;
  source: string | null;
  stage: LeadStage;
  valueMinor: number | null;
  currency: string;
  ownerId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
  convertedClientId: string | null;
  createdAt: string;
  updatedAt: string;
}
