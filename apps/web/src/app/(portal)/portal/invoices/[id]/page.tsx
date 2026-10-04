import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { PrintButton } from '@/shared/ui/print-button';
import { InvoiceDocument } from '@/features/invoices/components/invoice-document';
import { getInvoice } from '@/features/invoices/services/invoices.service';
import { portalClient } from '@/features/portal/services/portal.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const invoice = await getInvoice((await params).id);
  return { title: invoice?.number ?? t('portal.invoices.notFound') };
}

export default async function PortalInvoicePage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice || invoice.clientId !== session.clientId) notFound();
  if (invoice.status === 'DRAFT' || invoice.status === 'VOID') notFound();
  const client = await portalClient(session.clientId!);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/invoices">
            <ArrowLeft />
            {t('portal.invoices.back')}
          </Link>
        </Button>
        <PrintButton />
      </div>
      <InvoiceDocument
        invoice={invoice}
        issuerName={session.orgName}
        client={{ name: client?.name ?? '—', contactName: client?.contactName, contactEmail: client?.contactEmail }}
      />
    </div>
  );
}
