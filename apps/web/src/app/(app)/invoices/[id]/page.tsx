import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, Pencil, Send } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { ROLES_LEADERSHIP } from '@/shared/navigation/nav-config';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PrintButton } from '@/shared/ui/print-button';
import { getClient } from '@/features/clients/services/clients.service';
import { deleteInvoiceAction, setInvoiceStatusAction } from '@/features/invoices/actions/invoice.actions';
import { InvoiceDocument } from '@/features/invoices/components/invoice-document';
import { canTransitionInvoice } from '@agency-os/contracts';
import { isDraft } from '@/features/invoices/lifecycle';
import { getInvoice } from '@/features/invoices/services/invoices.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

const GUIDE: GuideItem[] = [{ title: t('invoices.guide.detail.title'), body: t('invoices.guide.detail.body') }];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const invoice = await getInvoice((await params).id);
  return { title: invoice?.number ?? t('invoices.notFound') };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await requireRole(ROLES_LEADERSHIP);
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const client = await getClient(invoice.clientId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/invoices">
            <ArrowLeft />
            {t('invoices.back')}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <PageGuide items={GUIDE} />
          <PrintButton />
          {isDraft(invoice.status) ? (
            <Button variant="secondary" asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Pencil />
                {t('common.edit')}
              </Link>
            </Button>
          ) : null}
          {canTransitionInvoice(invoice.status, 'SENT') ? <ActionButton action={setInvoiceStatusAction.bind(null, invoice.id, 'SENT')} label={t('invoices.action.send')} icon={<Send />} variant="primary" /> : null}
          {canTransitionInvoice(invoice.status, 'PAID') ? <ActionButton action={setInvoiceStatusAction.bind(null, invoice.id, 'PAID')} label={t('invoices.action.markPaid')} icon={<CheckCircle2 />} variant="primary" /> : null}
        </div>
      </div>

      <InvoiceDocument invoice={invoice} issuerName={session.orgName} client={{ name: client?.name ?? '—', contactName: client?.contactName, contactEmail: client?.contactEmail }} />

      <div className="mt-5 flex flex-wrap justify-end gap-2 print:hidden">
        {canTransitionInvoice(invoice.status, 'VOID') ? <ConfirmButton action={setInvoiceStatusAction.bind(null, invoice.id, 'VOID')} label={t('invoices.action.void')} icon={<Ban />} /> : null}
        {isDraft(invoice.status) ? <ConfirmButton action={deleteInvoiceAction.bind(null, invoice.id)} label={t('invoices.action.delete')} redirectTo="/invoices" /> : null}
      </div>
    </div>
  );
}
