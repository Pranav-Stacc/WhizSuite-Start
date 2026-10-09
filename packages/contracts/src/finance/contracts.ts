import { z } from 'zod';

export const ContractTypes = ['NDA', 'MSA', 'SOW', 'OTHER'] as const;
export type ContractType = (typeof ContractTypes)[number];

export const ContractStatuses = ['DRAFT', 'SENT', 'SIGNED', 'ACTIVE', 'EXPIRED', 'VOID'] as const;
export type ContractStatus = (typeof ContractStatuses)[number];

export const CONTRACT_TITLE_MAX_LENGTH = 200;
export const CONTRACT_LIST_LIMIT_DEFAULT = 200;

export const createContractSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(CONTRACT_TITLE_MAX_LENGTH),
  type: z.enum(ContractTypes).default('OTHER'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});
export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
  title: z.string().trim().min(1).max(CONTRACT_TITLE_MAX_LENGTH).optional(),
  type: z.enum(ContractTypes).optional(),
  status: z.enum(ContractStatuses).optional(),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  signedAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

export const ContractSignatureMethods = ['TYPED', 'DRAWN'] as const;
export type ContractSignatureMethod = (typeof ContractSignatureMethods)[number];

export const signContractSchema = z.object({
  signerName: z.string().trim().min(1).max(120),
  method: z.enum(ContractSignatureMethods).default('TYPED'),
});
export type SignContractInput = z.infer<typeof signContractSchema>;

export const presignContractUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.literal('application/pdf'),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});
export type PresignContractUploadInput = z.infer<typeof presignContractUploadSchema>;

export type ContractDto = {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  signedAt: string | null;
  storageKey: string | null;
  /** Immutable copy of the PDF at signing time; preferred for download after sign. */
  signedStorageKey: string | null;
  /** SHA-256 hex of the signed PDF bytes. */
  contentHash: string | null;
  signatureName: string | null;
  signatureMethod: ContractSignatureMethod | null;
  createdAt: string;
  updatedAt: string;
};
