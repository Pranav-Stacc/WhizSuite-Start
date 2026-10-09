import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

type FinanceTx = Prisma.TransactionClient;

const INVOICE_SELECT = {
  id: true,
  clientId: true,
  number: true,
  status: true,
  currency: true,
  subtotalMinor: true,
  taxMinor: true,
  totalMinor: true,
  dueDate: true,
  issuedAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPriceMinor: true,
      taxRateBps: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.InvoiceSelect;

export type InvoiceRecord = Prisma.InvoiceGetPayload<{
  select: typeof INVOICE_SELECT;
}>;

export interface InvoiceItemRow {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  taxRateBps: number;
}

export interface InvoiceAmounts {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface InvoiceCreateRow extends InvoiceAmounts {
  clientId: string;
  number: string;
  status: string;
  dueDate: Date;
  issuedAt: Date | null;
  items: InvoiceItemRow[];
}

export interface InvoiceChangeRow extends Partial<InvoiceAmounts> {
  clientId?: string;
  status?: string;
  dueDate?: Date;
  issuedAt?: Date;
  paidAt?: Date;
  /** When present, replaces every line item. */
  items?: InvoiceItemRow[];
}

export interface PaymentRow {
  amountMinor: number;
  currency: string;
  paidAt: Date;
}

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    limit: number,
    allowedClientIds?: string[],
  ): Promise<InvoiceRecord[]> {
    return this.prisma.invoice.findMany({
      where: {
        organizationId,
        ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
      },
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string): Promise<InvoiceRecord | null> {
    return this.prisma.invoice.findFirst({
      where: { id, organizationId },
      select: INVOICE_SELECT,
    });
  }

  async numberTaken(organizationId: string, number: string): Promise<boolean> {
    const existing = await this.prisma.invoice.findFirst({
      where: { organizationId, number },
      select: { id: true },
    });
    return existing !== null;
  }

  create(
    organizationId: string,
    row: InvoiceCreateRow,
  ): Promise<InvoiceRecord> {
    const { items, ...fields } = row;
    return this.prisma.invoice.create({
      data: {
        ...fields,
        organizationId,
        items: { create: items.map((item) => ({ ...item, organizationId })) },
      },
      select: INVOICE_SELECT,
    });
  }

  /** Applies the change, optionally replacing items and recording a payment, atomically. */
  update(
    organizationId: string,
    id: string,
    change: InvoiceChangeRow,
    payment?: PaymentRow,
  ): Promise<InvoiceRecord> {
    const { items, ...fields } = change;
    return this.prisma.$transaction(async (tx: FinanceTx) => {
      if (items) {
        await tx.invoiceItem.deleteMany({
          where: { organizationId, invoiceId: id },
        });
        await tx.invoiceItem.createMany({
          data: items.map((item) => ({
            ...item,
            organizationId,
            invoiceId: id,
          })),
        });
      }
      if (payment) {
        await tx.payment.create({
          data: { ...payment, organizationId, invoiceId: id },
        });
      }
      await tx.invoice.updateMany({
        where: { id, organizationId },
        data: fields,
      });
      return tx.invoice.findFirstOrThrow({
        where: { id, organizationId },
        select: INVOICE_SELECT,
      });
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.invoice.deleteMany({ where: { id, organizationId } });
  }

  listContracts(
    organizationId: string,
    clientId: string | undefined,
    limit: number,
    allowedClientIds?: string[],
  ) {
    return this.prisma.contract.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {}),
        ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findContract(organizationId: string, id: string) {
    return this.prisma.contract.findFirst({ where: { id, organizationId } });
  }

  createContract(
    organizationId: string,
    row: {
      clientId: string;
      title: string;
      type: string;
      status: string;
      startDate: Date | null;
      endDate: Date | null;
    },
  ) {
    return this.prisma.contract.create({
      data: { organizationId, ...row },
    });
  }

  async updateContract(
    organizationId: string,
    id: string,
    data: {
      title?: string;
      type?: string;
      status?: string;
      startDate?: Date | null;
      endDate?: Date | null;
      signedAt?: Date | null;
      storageKey?: string | null;
      signedStorageKey?: string | null;
      contentHash?: string | null;
      signatureName?: string | null;
      signatureMethod?: string | null;
      signatureIp?: string | null;
      signatureUserAgent?: string | null;
    },
  ) {
    await this.prisma.contract.updateMany({ where: { id, organizationId }, data });
    return this.prisma.contract.findFirstOrThrow({ where: { id, organizationId } });
  }
}
