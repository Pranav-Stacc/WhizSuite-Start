import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LineChart, MessageSquare, Receipt, Sparkles } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { StatCard } from '@/shared/ui/stat-card';
import { LogoTile } from '@/shared/ui/avatar';
import { portalClient, portalSummary } from '@/features/portal/services/portal.service';

export const metadata: Metadata = { title: t('portal.home.title') };

export default async function PortalHomePage() {
  const session = await requireSession();
  const clientId = session.clientId!;
  const [client, summary] = await Promise.all([portalClient(clientId), portalSummary(clientId)]);

  return (
    <div>
      <section className="card-surface mb-6 flex flex-wrap items-center gap-5 p-6">
        {client ? <LogoTile name={client.name} color={client.color} size="lg" /> : null}
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <Sparkles className="size-3.5 text-primary" />
            {t('portal.home.welcome')}
          </p>
          <h1 className="text-2xl font-semibold">{client?.name ?? session.orgName}</h1>
          <p className="mt-1 text-sm text-muted">{t('portal.home.subtitle', { name: session.name })}</p>
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label={t('portal.stat.approvals')} value={String(summary.approvals)} icon={<CheckCircle2 />} hint={t('portal.stat.approvals.hint')} />
        <StatCard label={t('portal.stat.invoices')} value={String(summary.openInvoices)} icon={<Receipt />} hint={t('portal.stat.invoices.hint')} />
        <StatCard label={t('portal.stat.messages')} value={String(summary.messages)} icon={<MessageSquare />} hint={t('portal.stat.messages.hint')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card hover>
          <CardHeader title={t('portal.home.approvals.title')} description={t('portal.home.approvals.body')} icon={<CheckCircle2 />} />
          <CardBody>
            <Button variant="primary" asChild>
              <Link href="/portal/approvals">
                {summary.approvals > 0 ? t('portal.home.approvals.cta', { count: summary.approvals }) : t('portal.home.approvals.empty')}
                <ArrowRight />
              </Link>
            </Button>
          </CardBody>
        </Card>
        <Card hover>
          <CardHeader title={t('portal.home.reports.title')} description={t('portal.home.reports.body')} icon={<LineChart />} />
          <CardBody>
            <Button variant="secondary" asChild>
              <Link href="/portal/reports">
                {t('portal.home.reports.cta')}
                <ArrowRight />
              </Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
