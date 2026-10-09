import 'server-only';
import type {
  ContractDto,
  CreateContractInput,
  PresignContractUploadInput,
  SignContractInput,
  UpdateContractInput,
} from '@agency-os/contracts';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';

const TAG = 'contracts';

async function org(): Promise<string> {
  return (await getSession())?.orgId ?? '';
}

export async function listAgreements(clientId: string): Promise<ContractDto[]> {
  if (!isLiveMode) return [];
  const organizationId = await org();
  if (!organizationId) return [];
  try {
    return await apiFetch<ContractDto[]>(`${orgPath(organizationId, 'contracts')}?clientId=${encodeURIComponent(clientId)}`, {
      tags: [TAG, `client:${clientId}`],
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return [];
    throw error;
  }
}

export async function createAgreement(input: CreateContractInput): Promise<ContractDto> {
  const organizationId = await org();
  return apiFetch<ContractDto>(orgPath(organizationId, 'contracts'), {
    method: 'POST',
    body: input,
  });
}

export async function updateAgreement(id: string, input: UpdateContractInput): Promise<ContractDto> {
  const organizationId = await org();
  return apiFetch<ContractDto>(`${orgPath(organizationId, 'contracts')}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function presignAgreementUpload(id: string, input: PresignContractUploadInput) {
  const organizationId = await org();
  return apiFetch<{ uploadUrl: string; headers: Record<string, string>; storageKey: string }>(
    `${orgPath(organizationId, 'contracts')}/${id}/presign-upload`,
    { method: 'POST', body: input },
  );
}

export async function completeAgreementUpload(id: string): Promise<ContractDto> {
  const organizationId = await org();
  return apiFetch<ContractDto>(`${orgPath(organizationId, 'contracts')}/${id}/complete-upload`, {
    method: 'POST',
    body: {},
  });
}

export async function signAgreement(id: string, input: SignContractInput): Promise<ContractDto> {
  const organizationId = await org();
  return apiFetch<ContractDto>(`${orgPath(organizationId, 'contracts')}/${id}/sign`, {
    method: 'POST',
    body: input,
  });
}

export async function agreementDownloadUrl(id: string): Promise<{ url: string }> {
  const organizationId = await org();
  return apiFetch<{ url: string }>(`${orgPath(organizationId, 'contracts')}/${id}/download`);
}
