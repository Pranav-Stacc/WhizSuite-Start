import { Permissions, type ContractStatus } from '@agency-os/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileSignature, Plus } from 'lucide-react';
import { getPermissions, requirePermission } from '@/shared/auth/permissions';
import { t, type MessageKey } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { SectionHeading } from '@/shared/ui/section-heading';
import { NewAgreementDialog } from '@/features/clients/components/agreement-dialogs';
import {
  AgreementPdfUpload,
  DownloadAgreementButton,
  SignAgreementButton,
} from '@/features/clients/components/agreement-sign-upload';
import { getClient } from '@/features/clients/services/clients.service';
import { listAgreements } from '@/features/clients/services/agreements.service';
import { clientSectionHref, clientSectionNumber } from '@/features/clients/workspace';

export const metadata = { title: t('clients.workspace.agreements') };

const SIGNED: ContractStatus[] = ['SIGNED', 'ACTIVE'];

export default async function ClientAgreementsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permissions.INVOICES_VIEW);
  const client = await getClient((await params).id);
  if (!client) notFound();
  const granted = await getPermissions();
  const canManage = granted.has(Permissions.INVOICES_CREATE);
  const agreements = await listAgreements(client.id);

  return (
    <section>
      <SectionHeading number={clientSectionNumber('agreements')} title={t('clients.workspace.agreements')}>
        {canManage ? (
          <NewAgreementDialog
            clientId={client.id}
            trigger={
              <Button variant="primary" size="sm">
                <Plus />
                {t('clients.agreements.new')}
              </Button>
            }
          />
        ) : null}
      </SectionHeading>

      {agreements.length === 0 ? (
        <div className="card-surface">
          <EmptyState icon={<FileSignature />} title={t('clients.agreements.empty.title')} body={t('clients.agreements.empty.body')} />
        </div>
      ) : (
        <ul className="card-surface divide-y divide-border-soft">
          {agreements.map((agreement) => {
            const signed = SIGNED.includes(agreement.status);
            const hasPdf = Boolean(agreement.storageKey);
            return (
              <li key={agreement.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{agreement.title}</p>
                  <p className="mt-1 text-[12px] text-muted">
                    {t(`clients.agreements.types.${agreement.type}` as MessageKey)}
                    <span className="mx-2 text-border">·</span>
                    {agreement.status}
                    {hasPdf ? (
                      <>
                        <span className="mx-2 text-border">·</span>
                        {t('clients.agreements.hasPdf')}
                      </>
                    ) : null}
                    {agreement.signatureName ? (
                      <>
                        <span className="mx-2 text-border">·</span>
                        {t('clients.agreements.signedBy', { name: agreement.signatureName })}
                      </>
                    ) : agreement.signedAt ? (
                      <>
                        <span className="mx-2 text-border">·</span>
                        {formatDate(agreement.signedAt)}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && !signed ? <AgreementPdfUpload id={agreement.id} /> : null}
                  {canManage && hasPdf && !signed ? <SignAgreementButton id={agreement.id} /> : null}
                  {hasPdf ? <DownloadAgreementButton id={agreement.id} /> : null}
                  {signed ? (
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={clientSectionHref(client.id, 'invoices')}>{t('clients.agreements.openBilling')}</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
