import type { Metadata } from 'next';
import { CalendarClock, CreditCard, Receipt, Sparkles } from 'lucide-react';
import { requireRole } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { Badge } from '@/shared/ui/badge';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/feedback';
import { ViewToggle, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { PlanCard } from '@/features/billing/components/plan-card';
import { UsageMeter } from '@/features/billing/components/usage-meter';
import { ANNUAL_DISCOUNT_PERCENT, BILLING_INTERVALS, type BillingInterval } from '@/features/billing/config';
import type { Plan } from '@/features/billing/data/plans.repository';
import type { BillingInvoice, Subscription } from '@/features/billing/data/subscription.repository';
import {
  chargePerPeriod,
  currentUsage,
  getSubscription,
  listBillingInvoices,
  listPlans,
  monthlyPrice,
  planChangesEnabled,
  usageRows,
} from '@/features/billing/services/billing.service';

export const metadata: Metadata = { title: t('billing.title') };

const BASE = '/billing';
const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

const GUIDE: GuideItem[] = [
  { title: t('billing.guide.usage.title'), body: t('billing.guide.usage.body') },
  { title: t('billing.guide.change.title'), body: t('billing.guide.change.body') },
  { title: t('billing.guide.downgrade.title'), body: t('billing.guide.downgrade.body') },
];

function parseInterval(value: string | undefined): BillingInterval | undefined {
  return BILLING_INTERVALS.find((i) => i === value?.toUpperCase());
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole(ROLES_OWNER);
  const sp = await searchParams;

  const [subscription, plans, usage, invoices] = await Promise.all([getSubscription(), listPlans(), currentUsage(), listBillingInvoices()]);
  const plan = subscription ? plans.find((p) => p.id === subscription.planId) : undefined;

  const interval = parseInterval(param(sp, 'interval')) ?? subscription?.interval ?? BILLING_INTERVALS[0];
  const currentMonthly = plan ? monthlyPrice(plan, interval) : undefined;
  const canChange = planChangesEnabled && ROLES_OWNER.includes(session.role);

  return (
    <div>
      <PageHeader title={t('billing.title')} description={t('billing.description')} eyebrow={<CreditCard className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      {subscription && plan ? (
        <CurrentPlan subscription={subscription} plan={plan} orgName={session.orgName} />
      ) : (
        <section className="card-surface mb-6">
          <EmptyState icon={<Sparkles />} title={t('billing.noSubscription.title')} body={t('billing.noSubscription.body')} />
        </section>
      )}

      <h2 className="mb-3 text-sm font-semibold">{t('billing.usage.title')}</h2>
      <ul className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {usageRows(usage, plan).map((row) => (
          <li key={row.key}>
            <UsageMeter row={row} />
          </li>
        ))}
      </ul>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t('billing.plans.title')}</h2>
        <ViewToggle
          items={BILLING_INTERVALS.map((value) => ({
            href: withQuery(BASE, sp, { interval: value.toLowerCase() }),
            label: value === 'YEARLY' ? t('billing.interval.YEARLY', { percent: ANNUAL_DISCOUNT_PERCENT }) : t('billing.interval.MONTHLY'),
            active: interval === value,
            icon: <CalendarClock />,
          }))}
        />
      </div>
      {plans.length === 0 ? (
        <section className="card-surface mb-8">
          <EmptyState title={t('billing.plans.empty')} />
        </section>
      ) : (
        <ul className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <li key={p.id}>
              <PlanCard
                plan={p}
                interval={interval}
                current={p.id === plan?.id && interval === subscription?.interval}
                switchesInterval={p.id === plan?.id && interval !== subscription?.interval}
                currentMonthly={currentMonthly}
                canChange={canChange}
              />
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader title={t('billing.history.title')} icon={<Receipt />} />
        <CardBody className="p-0">
          {invoices.length === 0 ? <EmptyState title={t('billing.history.empty')} /> : <BillingHistory invoices={invoices} />}
        </CardBody>
      </Card>
    </div>
  );
}

function CurrentPlan({ subscription, plan, orgName }: { subscription: Subscription; plan: Plan; orgName: string }) {
  const charge = chargePerPeriod(plan, subscription.interval);
  return (
    <section aria-label={t('billing.current')} className="card-surface mb-6 flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <Sparkles className="size-3.5 text-primary" />
          {t('billing.current')}
        </p>
        <p className="flex items-center gap-3 text-2xl font-semibold">
          {plan.name}
          <Badge tone={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>{t(`billing.status.${subscription.status}`)}</Badge>
        </p>
        <p className="mt-1 text-sm text-muted">{orgName}</p>
      </div>
      <dl className="flex flex-wrap gap-8">
        <div>
          <dt className="text-xs text-muted">{t('billing.charge')}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {charge === undefined ? t('billing.plan.custom') : formatMoney(charge)}
            <span className="ml-1 text-xs font-normal text-muted">{subscription.interval === 'YEARLY' ? t('billing.perYear') : t('billing.perMonth')}</span>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted">
            <CalendarClock className="size-3.5" />
            {t('billing.renews')}
          </dt>
          <dd className="text-lg font-semibold">{formatDate(subscription.currentPeriodEnd, DATE_FORMAT)}</dd>
        </div>
      </dl>
    </section>
  );
}

function BillingHistory({ invoices }: { invoices: BillingInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('billing.history.title')}</caption>
        <thead>
          <tr className="border-b border-border-soft text-left text-xs text-muted">
            <th scope="col" className="px-5 py-3 font-medium">{t('billing.history.number')}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('billing.history.date')}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('billing.history.plan')}</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">{t('billing.history.amount')}</th>
            <th scope="col" className="px-5 py-3 font-medium">{t('billing.history.status')}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-border-soft last:border-0">
              <td className="px-5 py-3 font-medium">{invoice.number}</td>
              <td className="px-5 py-3 text-muted">{formatDate(invoice.issuedAt, DATE_FORMAT)}</td>
              <td className="px-5 py-3 text-muted">{invoice.planName}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatMoney(invoice.amountMinor)}</td>
              <td className="px-5 py-3">
                <Badge tone="success">{t('billing.history.paid')}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
