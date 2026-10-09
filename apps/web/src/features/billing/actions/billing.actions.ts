'use server';

import { requireSession } from '@/shared/auth/session';
import { ROLES_OWNER } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { BILLING_INTERVALS, type BillingInterval } from '../config';
import { plansRepository } from '../data/plans.repository';
import { subscriptionRepository, SUBSCRIPTION_ID } from '../data/subscription.repository';
import { chargePerPeriod, currentUsage, exceededLimits, getSubscription, planChangesEnabled } from '../services/billing.service';

async function authorize() {
  const session = await requireSession();
  if (!ROLES_OWNER.includes(session.role)) throw new Error('forbidden');
  return session;
}

function parseInterval(value: string): BillingInterval | undefined {
  return BILLING_INTERVALS.find((i) => i === value);
}

export async function changePlanAction(planId: string, intervalRaw: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!planChangesEnabled) return fail(t('billing.contactSales'));
    const interval = parseInterval(intervalRaw);
    const plan = await plansRepository.get(planId);
    if (!interval || !plan) return fail(t('toast.failed'));
    if (plan.monthlyMinor === undefined) return fail(t('billing.contactSales'));

    const before = await getSubscription();
    if (!before) return fail(t('billing.contactSales'));
    if (before.planId === planId && before.interval === interval) return fail(t('billing.alreadyOnPlan'));

    const blocking = exceededLimits(await currentUsage(), plan);
    if (blocking.length > 0) {
      return fail(t('billing.downgradeBlocked', { limits: blocking.map((key) => t(`billing.limit.${key}`)).join(', ') }));
    }

    const previousPlan = await plansRepository.get(before.planId);
    await subscriptionRepository.update(SUBSCRIPTION_ID, { planId, interval, status: 'ACTIVE' });
    await recordAudit({
      action: 'subscription.changed',
      entityType: 'subscription',
      entityId: SUBSCRIPTION_ID,
      entityLabel: plan.name,
      summary: `Changed plan to ${plan.name} (${interval.toLowerCase()})`,
      diff: {
        plan: { from: previousPlan?.name ?? before.planId, to: plan.name },
        interval: { from: before.interval, to: interval },
        charge: { to: String(chargePerPeriod(plan, interval) ?? 0) },
      },
    });
    await refreshData('billing');
    return succeed(undefined, t('billing.planChanged', { plan: plan.name }));
  });
}
