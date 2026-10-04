import { ArrowDownRight, ArrowUpRight, Check } from 'lucide-react';
import { LIMIT_KEYS, type BillingInterval } from '../config';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { ActionButton } from '@/shared/ui/action-button';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { cn } from '@/shared/lib/cn';
import { changePlanAction } from '../actions/billing.actions';
import type { Plan } from '../data/plans.repository';
import { monthlyPrice } from '../services/billing.service';
import { formatLimitValue } from './usage-meter';

interface PlanCardProps {
  plan: Plan;
  interval: BillingInterval;
  current: boolean;
  /** True for the subscribed plan viewed under the other billing interval. */
  switchesInterval: boolean;
  /** Price of the subscribed plan in the same interval, to label the change as upgrade or downgrade. */
  currentMonthly?: number;
  canChange: boolean;
}

export function PlanCard({ plan, interval, current, switchesInterval, currentMonthly, canChange }: PlanCardProps) {
  const price = monthlyPrice(plan, interval);
  const isDowngrade = price !== undefined && currentMonthly !== undefined && price < currentMonthly;
  const action = changePlanAction.bind(null, plan.id, interval);

  return (
    <article className={cn('card-surface flex h-full flex-col gap-5 p-5', current && 'border-primary/60 shadow-[0_0_0_1px_var(--primary)]')} aria-label={plan.name}>
      <header>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{plan.name}</h3>
          {current ? <Badge tone="primary">{t('billing.plan.current')}</Badge> : plan.recommended ? <Badge tone="info">{t('billing.plan.popular')}</Badge> : null}
        </div>
        <p className="text-xs text-muted">{plan.tagline}</p>
        <p className="mt-3 flex items-baseline gap-1">
          {price === undefined ? (
            <span className="text-2xl font-semibold">{t('billing.plan.custom')}</span>
          ) : (
            <>
              <span className="text-3xl font-semibold tabular-nums">{formatMoney(price)}</span>
              <span className="text-xs text-muted">{t('billing.perMonth')}</span>
            </>
          )}
        </p>
        {price !== undefined && interval === 'YEARLY' ? <p className="text-xs text-success">{t('billing.billedYearly')}</p> : null}
      </header>

      <ul className="space-y-2 text-[13px]">
        {LIMIT_KEYS.map((key) => {
          const limit = plan.limits[key];
          return (
            <li key={key} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="font-semibold">{limit === undefined ? t('billing.unlimited') : formatLimitValue(key, limit)}</strong> {t(`billing.limit.${key}`).toLowerCase()}
              </span>
            </li>
          );
        })}
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-muted">
            <Check className="size-4 shrink-0 text-primary" aria-hidden />
            {t(`billing.feature.${feature}`)}
          </li>
        ))}
      </ul>

      <footer className="mt-auto">
        {current ? (
          <Button variant="secondary" disabled className="w-full">
            {t('billing.plan.current')}
          </Button>
        ) : price === undefined ? (
          <Button variant="secondary" disabled className="w-full">
            {t('billing.contactSales')}
          </Button>
        ) : !canChange ? null : switchesInterval ? (
          <ActionButton action={action} label={t(`billing.switchTo.${interval}`)} variant="secondary" className="w-full" />
        ) : isDowngrade ? (
          <ConfirmButton action={action} label={t('billing.plan.downgrade', { plan: plan.name })} icon={<ArrowDownRight />} variant="secondary" className="w-full" />
        ) : (
          <ActionButton action={action} label={t('billing.plan.upgrade', { plan: plan.name })} icon={<ArrowUpRight />} variant="primary" className="w-full" />
        )}
      </footer>
    </article>
  );
}
