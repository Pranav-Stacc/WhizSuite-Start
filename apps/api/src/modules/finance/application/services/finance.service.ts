import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BASIS_POINTS_PER_PERCENT,
  ErrorCodes,
  InvoiceStatuses,
  canTransitionInvoice,
  computeInvoiceTotals,
  type InvoiceCreateInput,
  type InvoiceDto,
  type InvoiceLineInput,
  type InvoiceStatus,
  type InvoiceUpdateInput,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { ClientsService } from '../../../clients/application/services/clients.service';
import {
  FinanceRepository,
  type InvoiceAmounts,
  type InvoiceChangeRow,
  type InvoiceItemRow,
  type InvoiceRecord,
  type PaymentRow,
} from '../../infrastructure/repositories/finance.repository';

const ENTITY_TYPE = 'invoice';
const EDITABLE_STATUS: InvoiceStatus = 'DRAFT';
const DEFAULT_CREATE_STATUS: InvoiceStatus = 'DRAFT';

@Injectable()
export class FinanceService {
  constructor(
    private readonly repository: FinanceRepository,
    private readonly clients: ClientsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<InvoiceDto[]> {
    const limit = this.config.get('INVOICE_LIST_LIMIT', { infer: true });
    const records = await this.repository.list(organizationId, limit);
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
    if (!record) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        'Invoice not found',
      );
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

function unprocessable(detail: string) {
  return problem(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Unprocessable Entity',
    ErrorCodes.VALIDATION_FAILED,
    detail,
  );
}
