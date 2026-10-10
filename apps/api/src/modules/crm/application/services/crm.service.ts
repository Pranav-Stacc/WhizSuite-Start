import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  LeadStages,
  type LeadCreateInput,
  type LeadDto,
  type LeadStage,
  type LeadUpdateInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { leadMatchesScope } from '../../../../shared/tenant/scope-filters';
import { AuditService } from '../../../audit/application/services/audit.service';
import {
  CrmRepository,
  type LeadFields,
  type LeadRecord,
  type PipelineRef,
} from '../../infrastructure/repositories/crm.repository';

const ENTITY_TYPE = 'lead';
const DEFAULT_STAGE: LeadStage = 'NEW';

/** Lead attributes without dedicated columns, kept in `customFields`. */
const CUSTOM_KEYS = [
  'contactName',
  'contactEmail',
  'nextStep',
  'nextStepAt',
] as const;
type CustomKey = (typeof CUSTOM_KEYS)[number];
type LeadCustomFields = Partial<Record<CustomKey, string>>;

@Injectable()
export class CrmService {
  constructor(
    private readonly repository: CrmRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<LeadDto[]> {
    const limit = this.config.get('LEAD_LIST_LIMIT', { infer: true });
    const records = await this.repository.list(
      organizationId,
      limit,
      TenantContext.leadScope(),
    );
    return records.map(toLeadDto);
  }

  async get(organizationId: string, id: string): Promise<LeadDto> {
    return toLeadDto(await this.require(organizationId, id));
  }

  async create(
    organizationId: string,
    actorId: string,
    input: LeadCreateInput,
  ): Promise<LeadDto> {
    const pipeline = await this.defaultPipeline(organizationId);
    const fields = toLeadFields(input, {});
    const record = await this.repository.create(organizationId, pipeline.id, {
      ...fields,
      companyName: input.companyName,
      ownerId: input.ownerId ?? actorId,
      stageId: stageIdOf(pipeline, input.stage ?? DEFAULT_STAGE),
    });
    const dto = toLeadDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'lead.create',
      entityType: ENTITY_TYPE,
      entityId: dto.id,
      after: { ...dto },
    });
    return dto;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: LeadUpdateInput,
  ): Promise<LeadDto> {
    const current = await this.require(organizationId, id);
    const before = toLeadDto(current);
    const fields = toLeadFields(input, customFieldsOf(current));
    if (input.stage) {
      fields.stageId = stageIdOf(
        await this.defaultPipeline(organizationId),
        input.stage,
      );
    }
    if (input.convertedClientId)
      fields.convertedClientId = input.convertedClientId;
    const dto = toLeadDto(
      await this.repository.update(organizationId, id, fields),
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action:
        input.stage && input.stage !== before.stage
          ? 'lead.stage_change'
          : 'lead.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { ...before },
      after: { ...dto },
    });
    return dto;
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const before = toLeadDto(await this.require(organizationId, id));
    await this.repository.delete(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'lead.delete',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { ...before },
    });
  }

  private async require(
    organizationId: string,
    id: string,
  ): Promise<LeadRecord> {
    const record = await this.repository.findById(organizationId, id);
    if (
      !record ||
      !leadMatchesScope(record, TenantContext.leadScope() ?? {})
    ) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        'Lead not found',
      );
    }
    return record;
  }

  /** Provisions the default pipeline (and any stage added to `LeadStages` since) on first use. */
  private async defaultPipeline(organizationId: string): Promise<PipelineRef> {
    const existing = await this.repository.findDefaultPipeline(organizationId);
    if (!existing) {
      return this.repository.createDefaultPipeline(
        organizationId,
        this.config.get('CRM_DEFAULT_PIPELINE_NAME', { infer: true }),
        LeadStages,
      );
    }
    const known = new Set(existing.stages.map((stage) => stage.name));
    const missing = LeadStages.filter((stage) => !known.has(stage));
    if (missing.length === 0) return existing;
    const nextOrder =
      Math.max(-1, ...existing.stages.map((stage) => stage.order)) + 1;
    await this.repository.addMissingStages(
      organizationId,
      existing.id,
      missing,
      nextOrder,
    );
    const refreshed = await this.repository.findDefaultPipeline(organizationId);
    return refreshed ?? existing;
  }
}

function stageIdOf(pipeline: PipelineRef, stage: LeadStage): string {
  const match = pipeline.stages.find((candidate) => candidate.name === stage);
  if (!match) {
    throw problem(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Unprocessable Entity',
      ErrorCodes.VALIDATION_FAILED,
      `Pipeline has no ${stage} stage`,
    );
  }
  return match.id;
}

const blankToNull = (value: string | undefined): string | null | undefined =>
  value === undefined ? undefined : value === '' ? null : value;

function toLeadFields(
  input: LeadUpdateInput,
  currentCustom: LeadCustomFields,
): LeadFields {
  const fields: LeadFields = {};
  if (input.companyName) fields.companyName = input.companyName;
  if (input.brandName !== undefined)
    fields.brandName = blankToNull(input.brandName);
  if (input.website !== undefined) fields.website = blankToNull(input.website);
  if (input.industry !== undefined)
    fields.industry = blankToNull(input.industry);
  if (input.source !== undefined) fields.source = blankToNull(input.source);
  if (input.ownerId) fields.ownerId = input.ownerId;
  if (input.valueMinor !== undefined)
    fields.estimatedValueMinor = input.valueMinor;

  const custom: LeadCustomFields = { ...currentCustom };
  let customChanged = false;
  for (const key of CUSTOM_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    customChanged = true;
    if (value === '') delete custom[key];
    else custom[key] = value;
  }
  if (customChanged) fields.customFields = custom;
  return fields;
}

function customFieldsOf(record: LeadRecord): LeadCustomFields {
  const raw = record.customFields;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const custom: LeadCustomFields = {};
  for (const key of CUSTOM_KEYS) {
    const value = raw[key];
    if (typeof value === 'string') custom[key] = value;
  }
  return custom;
}

function toLeadStage(name: string): LeadStage {
  return LeadStages.find((stage) => stage === name) ?? DEFAULT_STAGE;
}

function toLeadDto(record: LeadRecord): LeadDto {
  const custom = customFieldsOf(record);
  return {
    id: record.id,
    companyName: record.companyName,
    brandName: record.brandName,
    website: record.website,
    industry: record.industry,
    source: record.source,
    stage: toLeadStage(record.stage.name),
    valueMinor: record.estimatedValueMinor,
    currency: record.currency,
    ownerId: record.ownerId,
    contactName: custom.contactName ?? null,
    contactEmail: custom.contactEmail ?? null,
    nextStep: custom.nextStep ?? null,
    nextStepAt: custom.nextStepAt ?? null,
    convertedClientId: record.convertedClientId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
