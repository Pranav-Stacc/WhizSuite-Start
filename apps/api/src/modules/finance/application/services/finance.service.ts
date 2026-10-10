import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BASIS_POINTS_PER_PERCENT,
  CONTRACT_LIST_LIMIT_DEFAULT,
  ContractStatuses,
  ContractTypes,
  DomainEventTypes,
  ErrorCodes,
  InvoiceStatuses,
  canTransitionInvoice,
  computeInvoiceTotals,
  type ContractDto,
  type ContractSignatureMethod,
  type ContractStatus,
  type ContractType,
  type CreateContractInput,
  type InvoiceCreateInput,
  type InvoiceDto,
  type InvoiceLineInput,
  type InvoiceStatus,
  type InvoiceUpdateInput,
  type PresignContractUploadInput,
  type SignContractInput,
  type UpdateContractInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { ClientsService } from '../../../clients/application/services/clients.service';
import { MembersService } from '../../../identity/application/services/members.service';
import {
  FinanceRepository,
  type InvoiceAmounts,
  type InvoiceChangeRow,
  type InvoiceItemRow,
  type InvoiceRecord,
  type PaymentRow,
} from '../../infrastructure/repositories/finance.repository';

const ENTITY_TYPE = 'invoice';
const CONTRACT_ENTITY = 'contract';
const EDITABLE_STATUS: InvoiceStatus = 'DRAFT';
const DEFAULT_CREATE_STATUS: InvoiceStatus = 'DRAFT';
const DEFAULT_CONTRACT_STATUS: ContractStatus = 'DRAFT';

@Injectable()
export class FinanceService {
  constructor(
    private readonly repository: FinanceRepository,
    private readonly clients: ClientsService,
    private readonly members: MembersService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async listContracts(organizationId: string, clientId?: string): Promise<ContractDto[]> {
    const records = await this.repository.listContracts(
      organizationId,
      clientId,
      CONTRACT_LIST_LIMIT_DEFAULT,
      TenantContext.clientScope(),
    );
    return records.map(toContractDto);
  }

  async createContract(
    organizationId: string,
    actorId: string,
    input: CreateContractInput,
  ): Promise<ContractDto> {
    await this.clients.get(organizationId, input.clientId);
    const record = await this.repository.createContract(organizationId, {
      clientId: input.clientId,
      title: input.title,
      type: input.type ?? 'OTHER',
      status: DEFAULT_CONTRACT_STATUS,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    });
    const dto = toContractDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'contract.create',
      entityType: CONTRACT_ENTITY,
      entityId: dto.id,
      after: { ...dto },
    });
    return dto;
  }

  async updateContract(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateContractInput,
  ): Promise<ContractDto> {
    const existing = await this.repository.findContract(organizationId, id);
    if (!existing || !TenantContext.canAccessClient(existing.clientId)) {
      throw notFound('Contract not found');
    }
    const before = toContractDto(existing);
    const record = await this.repository.updateContract(organizationId, id, {
      title: input.title,
      type: input.type,
      status: input.status,
      startDate:
        input.startDate === undefined
          ? undefined
          : input.startDate
            ? new Date(input.startDate)
            : null,
      endDate:
        input.endDate === undefined ? undefined : input.endDate ? new Date(input.endDate) : null,
      signedAt:
        input.signedAt === undefined
          ? undefined
          : input.signedAt
            ? new Date(input.signedAt)
            : input.status === 'SIGNED'
              ? new Date()
              : null,
    });
    const dto = toContractDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'contract.update',
      entityType: CONTRACT_ENTITY,
      entityId: dto.id,
      before: { ...before },
      after: { ...dto },
    });
    return dto;
  }

  async presignContractUpload(
    organizationId: string,
    actorId: string,
    id: string,
    input: PresignContractUploadInput,
  ) {
    await this.requireContract(organizationId, id);
    const upload = await this.storage.createPresignedUpload({
      organizationId,
      filename: `agreement-${id}-${input.filename.replace(/\.pdf$/i, '')}.pdf`,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    await this.repository.updateContract(organizationId, id, {
      storageKey: upload.storageKey,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'contract.pdf_presign',
      entityType: CONTRACT_ENTITY,
      entityId: id,
      after: { storageKey: upload.storageKey },
    });
    return {
      uploadUrl: upload.uploadUrl,
      storageKey: upload.storageKey,
      headers: upload.headers,
      expiresInSeconds: upload.expiresInSeconds,
    };
  }

  async completeContractUpload(organizationId: string, actorId: string, id: string) {
    const contract = await this.requireContract(organizationId, id);
    if (!contract.storageKey) throw unprocessable('No upload in progress for this agreement');
    const meta = await this.storage.getObjectMetadata(contract.storageKey);
    if (!meta) throw unprocessable('Uploaded PDF was not found in storage');
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'contract.pdf_uploaded',
      entityType: CONTRACT_ENTITY,
      entityId: id,
      after: { storageKey: contract.storageKey, sizeBytes: meta.sizeBytes },
    });
    return toContractDto(contract);
  }

  async signContract(
    organizationId: string,
    actorId: string,
    id: string,
    input: SignContractInput,
  ): Promise<ContractDto> {
    const existing = await this.requireContract(organizationId, id);
    if (!existing.storageKey) {
      throw unprocessable('Upload the agreement PDF before collecting a signature');
    }
    if (existing.status === 'SIGNED' && existing.signedStorageKey) {
      throw unprocessable('This agreement is already signed');
    }
    const signed = await this.storage.copyObjectImmutable({
      sourceKey: existing.storageKey,
      organizationId,
      filename: `agreement-${id}-signed.pdf`,
    });
    const ctx = TenantContext.get();
    const record = await this.repository.updateContract(organizationId, id, {
      status: 'SIGNED',
      signedAt: new Date(),
      signatureName: input.signerName,
      signatureMethod: input.method,
      signedStorageKey: signed.storageKey,
      contentHash: signed.contentHash,
      signatureIp: ctx?.ipAddress ?? null,
      signatureUserAgent: ctx?.userAgent ?? null,
    });
    const dto = toContractDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'contract.signed',
      entityType: CONTRACT_ENTITY,
      entityId: id,
      after: {
        ...dto,
        contentHash: signed.contentHash,
        signedStorageKey: signed.storageKey,
        sizeBytes: signed.sizeBytes,
      },
    });
    return dto;
  }

  async contractDownloadUrl(organizationId: string, id: string) {
    const contract = await this.requireContract(organizationId, id);
    const key = contract.signedStorageKey ?? contract.storageKey;
    if (!key) throw notFound('Agreement PDF not found');
    const suffix = contract.signedStorageKey ? '-signed' : '';
    return this.storage.createPresignedDownload(key, {
      filename: `${contract.title.replace(/[^\w.-]+/g, '_')}${suffix}.pdf`,
      disposition: 'attachment',
    });
  }

  private async requireContract(organizationId: string, id: string) {
    const record = await this.repository.findContract(organizationId, id);
    if (!record || !TenantContext.canAccessClient(record.clientId)) {
      throw notFound('Contract not found');
    }
    return record;
  }

  async list(organizationId: string): Promise<InvoiceDto[]> {
    const limit = this.config.get('INVOICE_LIST_LIMIT', { infer: true });
    const records = await this.repository.list(
      organizationId,
      limit,
      TenantContext.clientScope(),
    );
    return records.map(toInvoiceDto);
  }

  async get(organizationId: string, id: string): Promise<InvoiceDto> {
    return toInvoiceDto(await this.require(organizationId, id));
  }

  async create(
    organizationId: string,
    actorId: string,
    input: InvoiceCreateInput,
  ): Promise<InvoiceDto> {
    this.assertLineCount(input.lines);
    await this.clients.get(organizationId, input.clientId);
    if (await this.repository.numberTaken(organizationId, input.number)) {
      throw duplicateNumber(input.number);
    }
    const status = input.status ?? DEFAULT_CREATE_STATUS;
    const record = await this.repository.create(organizationId, {
      clientId: input.clientId,
      number: input.number,
      status,
      dueDate: new Date(input.dueDate),
      issuedAt: status === EDITABLE_STATUS ? null : new Date(),
      ...amountsOf(input.lines, input.taxRate),
      items: itemRows(input.lines, input.taxRate),
    });
    const dto = toInvoiceDto(record);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'invoice.create',
      entityType: ENTITY_TYPE,
      entityId: dto.id,
      after: snapshot(dto),
    });
    return dto;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: InvoiceUpdateInput,
  ): Promise<InvoiceDto> {
    const before = toInvoiceDto(await this.require(organizationId, id));
    const editsContent =
      input.clientId !== undefined ||
      input.dueDate !== undefined ||
      input.taxRate !== undefined ||
      input.lines !== undefined;
    if (editsContent && before.status !== EDITABLE_STATUS) {
      throw unprocessable('Only draft invoices can be edited');
    }
    if (input.lines) this.assertLineCount(input.lines);
    if (input.clientId) await this.clients.get(organizationId, input.clientId);

    const change: InvoiceChangeRow = {};
    if (input.clientId) change.clientId = input.clientId;
    if (input.dueDate) change.dueDate = new Date(input.dueDate);
    if (input.lines !== undefined || input.taxRate !== undefined) {
      const lines = input.lines ?? before.lines;
      const taxRate = input.taxRate ?? before.taxRate;
      Object.assign(change, amountsOf(lines, taxRate), {
        items: itemRows(lines, taxRate),
      });
    }

    let payment: PaymentRow | undefined;
    const target = input.status;
    if (target && target !== before.status) {
      if (!canTransitionInvoice(before.status, target)) {
        throw unprocessable(
          `Cannot move an invoice from ${before.status} to ${target}`,
        );
      }
      const now = new Date();
      change.status = target;
      if (target === 'SENT') change.issuedAt = now;
      if (target === 'PAID') {
        change.paidAt = now;
        payment = {
          amountMinor: change.totalMinor ?? before.totalMinor,
          currency: before.currency,
          paidAt: now,
        };
      }
    }

    const dto = toInvoiceDto(
      await this.repository.update(organizationId, id, change, payment),
    );
    if (change.status === 'PAID') {
      const members = await this.members.list(organizationId);
      const recipientIds = members
        .filter((m) => m.membershipType !== 'CLIENT')
        .map((m) => m.id);
      await this.outbox.write({
        type: DomainEventTypes.INVOICE_PAID,
        version: 1,
        organizationId,
        payload: {
          invoiceId: dto.id,
          title: dto.number,
          recipientIds,
        },
        actor: { id: actorId, type: 'user' },
      });
    }
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: change.status
        ? `invoice.${change.status.toLowerCase()}`
        : 'invoice.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: snapshot(before),
      after: snapshot(dto),
    });
    return dto;
  }

  async remove(
    organizationId: string,
    actorId: string,
    id: string,
  ): Promise<void> {
    const before = toInvoiceDto(await this.require(organizationId, id));
    if (before.status !== EDITABLE_STATUS) {
      throw unprocessable('Only draft invoices can be deleted');
    }
    await this.repository.delete(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'invoice.delete',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: snapshot(before),
    });
  }

  private async require(
    organizationId: string,
    id: string,
  ): Promise<InvoiceRecord> {
    const record = await this.repository.findById(organizationId, id);
    if (!record || !TenantContext.canAccessClient(record.clientId)) {
      throw notFound('Invoice not found');
    }
    return record;
  }

  private assertLineCount(lines: readonly InvoiceLineInput[]): void {
    const max = this.config.get('INVOICE_LINES_MAX', { infer: true });
    if (lines.length > max)
      throw unprocessable(`An invoice can have at most ${max} lines`);
  }
}

function amountsOf(
  lines: readonly InvoiceLineInput[],
  taxRate: number,
): InvoiceAmounts {
  const totals = computeInvoiceTotals(lines, taxRate);
  return {
    subtotalMinor: totals.subtotal,
    taxMinor: totals.tax,
    totalMinor: totals.total,
  };
}

function itemRows(
  lines: readonly InvoiceLineInput[],
  taxRate: number,
): InvoiceItemRow[] {
  const taxRateBps = Math.round(taxRate * BASIS_POINTS_PER_PERCENT);
  return lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPriceMinor: line.unitMinor,
    taxRateBps,
  }));
}

function toInvoiceDto(record: InvoiceRecord): InvoiceDto {
  const [firstItem] = record.items;
  return {
    id: record.id,
    clientId: record.clientId,
    number: record.number,
    status: toInvoiceStatus(record.status),
    currency: record.currency,
    taxRate: firstItem ? firstItem.taxRateBps / BASIS_POINTS_PER_PERCENT : 0,
    subtotalMinor: record.subtotalMinor,
    taxMinor: record.taxMinor,
    totalMinor: record.totalMinor,
    issueDate: record.issuedAt?.toISOString() ?? null,
    dueDate: record.dueDate?.toISOString() ?? null,
    paidAt: record.paidAt?.toISOString() ?? null,
    lines: record.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitMinor: item.unitPriceMinor,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toInvoiceStatus(value: string): InvoiceStatus {
  const status = InvoiceStatuses.find((candidate) => candidate === value);
  if (!status) throw new Error(`Unknown invoice status in storage: ${value}`);
  return status;
}

function snapshot(dto: InvoiceDto): Record<string, unknown> {
  return { ...dto };
}

function duplicateNumber(number: string) {
  return problem(
    HttpStatus.CONFLICT,
    'Conflict',
    ErrorCodes.CONFLICT,
    `Invoice number ${number} is already in use`,
  );
}

function toContractDto(record: {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  type: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  signedAt: Date | null;
  storageKey: string | null;
  signedStorageKey?: string | null;
  contentHash?: string | null;
  signatureName?: string | null;
  signatureMethod?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ContractDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    clientId: record.clientId,
    title: record.title,
    type: toContractType(record.type),
    status: toContractStatus(record.status),
    startDate: record.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: record.endDate?.toISOString().slice(0, 10) ?? null,
    signedAt: record.signedAt?.toISOString() ?? null,
    storageKey: record.storageKey,
    signedStorageKey: record.signedStorageKey ?? null,
    contentHash: record.contentHash ?? null,
    signatureName: record.signatureName ?? null,
    signatureMethod: toSignatureMethod(record.signatureMethod),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toSignatureMethod(value: string | null | undefined): ContractSignatureMethod | null {
  if (value === 'TYPED' || value === 'DRAWN') return value;
  return null;
}

function toContractType(value: string): ContractType {
  const type = ContractTypes.find((candidate) => candidate === value);
  return type ?? 'OTHER';
}

function toContractStatus(value: string): ContractStatus {
  const status = ContractStatuses.find((candidate) => candidate === value);
  return status ?? 'DRAFT';
}
