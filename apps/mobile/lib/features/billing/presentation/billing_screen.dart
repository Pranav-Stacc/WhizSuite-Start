import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../application/billing_providers.dart';
import '../domain/billing.dart';
import 'billing_labels.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  String? _interval;

  Future<void> _refresh() async {
    ref.invalidate(billingOverviewProvider);
    await ref.read(billingOverviewProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final overview = ref.watch(billingOverviewProvider);

    return PageScaffold(
      title: l10n.billingTitle,
      body: AsyncValueView<BillingOverview>(
        value: overview,
        onRetry: () => ref.invalidate(billingOverviewProvider),
        data: (data) {
          final intervals = data.intervals;
          final interval = _interval ??
              data.subscription?.priceFor(BillingIntervals.month)?.interval ??
              (intervals.isNotEmpty ? intervals.first : BillingIntervals.month);
          final tokens = context.tokens;
          final subscription = data.subscription;
          return ReadableBody(
            onRefresh: _refresh,
            children: [
              FadeSlideIn(
                child: subscription == null
                    ? EmptyState(
                        icon: Icons.credit_card_outlined,
                        title: l10n.billingNoSubscription,
                        body: l10n.billingNoSubscriptionBody,
                      )
                    : _CurrentPlanCard(subscription: subscription),
              ),
              SizedBox(height: tokens.xl),
              if (subscription != null && !subscription.entitlements.isEmpty) ...[
                FadeSlideIn(
                  index: 1,
                  child: _EntitlementsSection(entitlements: subscription.entitlements),
                ),
                SizedBox(height: tokens.xl),
              ],
              FadeSlideIn(
                index: 2,
                child: _PlansSection(
                  overview: data,
                  interval: interval,
                  onInterval: intervals.length > 1 ? (value) => setState(() => _interval = value) : null,
                ),
              ),
              SizedBox(height: tokens.lg),
              FadeSlideIn(
                index: 3,
                child: Text(
                  l10n.billingManagedNote,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                ),
              ),
              SizedBox(height: tokens.md),
              FadeSlideIn(
                index: 4,
                child: Text(
                  l10n.billingInvoicesUnavailable,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CurrentPlanCard extends StatelessWidget {
  const _CurrentPlanCard({required this.subscription});

  final Subscription subscription;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final price = subscription.priceFor(BillingIntervals.month) ??
        (subscription.prices.isNotEmpty ? subscription.prices.first : null);
    final periodEnd = subscription.currentPeriodEnd;
    final trialEnd = subscription.trialEndsAt;
    final progress = subscription.periodProgress();

    final tiles = [
      MetricTile(
        label: l10n.billingCharge,
        icon: Icons.payments_outlined,
        value: price == null ? l10n.billingCustomPrice : billingPriceLabel(l10n, formats, price),
      ),
      if (periodEnd != null)
        MetricTile(
          label: subscription.isCanceled ? l10n.billingPeriodEnds : l10n.billingRenews,
          icon: Icons.event_outlined,
          value: formats.date(periodEnd),
          caption: l10n.billingDaysLeft(Subscription.daysUntil(periodEnd)),
        ),
      if (subscription.isTrialing && trialEnd != null)
        MetricTile(
          label: l10n.billingTrialEnds,
          icon: Icons.hourglass_bottom,
          value: formats.date(trialEnd),
          caption: l10n.billingDaysLeft(Subscription.daysUntil(trialEnd)),
          tone: StatusTone.warning,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SectionHeader(title: l10n.billingCurrentPlan),
              Row(
                children: [
                  Expanded(child: Text(subscription.planName, style: text.headlineSmall)),
                  StatusBadge(
                    label: subscriptionStatusLabel(l10n, subscription.status),
                    tone: subscriptionStatusTone(subscription.status),
                  ),
                ],
              ),
              if (progress != null) ...[
                SizedBox(height: tokens.lg),
                Text(l10n.billingPeriodProgress, style: text.labelMedium?.copyWith(color: tokens.muted)),
                SizedBox(height: tokens.xs),
                ProgressMeter(value: progress, label: l10n.billingPeriodProgress),
              ],
            ],
          ),
        ),
        SizedBox(height: tokens.md),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = gridColumns(constraints.maxWidth, minTileWidth: 160, max: tiles.length);
            final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
            return Wrap(
              spacing: tokens.md,
              runSpacing: tokens.md,
              children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
            );
          },
        ),
      ],
    );
  }
}

class _EntitlementsSection extends StatelessWidget {
  const _EntitlementsSection({required this.entitlements});

  final Entitlements entitlements;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final tokens = context.tokens;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (entitlements.limits.isNotEmpty) ...[
          SectionHeader(title: l10n.billingLimits),
          SurfaceCard(
            child: Column(
              children: [
                for (final (index, limit) in entitlements.limits.indexed) ...[
                  if (index > 0) Divider(height: tokens.lg * 2, color: tokens.border),
                  Row(
                    children: [
                      Expanded(child: Text(billingLimitLabel(l10n, limit.key))),
                      Text(
                        billingLimitCap(l10n, formats, limit),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          SizedBox(height: tokens.xl),
        ],
        if (entitlements.features.isNotEmpty) ...[
          SectionHeader(title: l10n.billingFeatures),
          SurfaceCard(
            child: Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [
                for (final feature in entitlements.features)
                  StatusBadge(label: billingFeatureLabel(l10n, feature), tone: StatusTone.success),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _PlansSection extends StatelessWidget {
  const _PlansSection({required this.overview, required this.interval, required this.onInterval});

  final BillingOverview overview;
  final String interval;
  final ValueChanged<String>? onInterval;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final intervals = overview.intervals;
    final saving = overview.bestYearlySaving;
    final onChange = onInterval;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          title: l10n.billingPlans,
          trailing: saving == null
              ? null
              : Text(
                  l10n.billingYearlySaving(saving),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                ),
        ),
        if (onChange != null && intervals.length > 1) ...[
          SegmentedButton<String>(
            segments: [
              for (final value in intervals)
                ButtonSegment(value: value, label: Text(billingIntervalLabel(l10n, value))),
            ],
            selected: {interval},
            onSelectionChanged: (value) => onChange(value.first),
          ),
          SizedBox(height: tokens.md),
        ],
        if (overview.plans.isEmpty)
          EmptyState(icon: Icons.storefront_outlined, title: l10n.billingPlansEmpty, body: l10n.billingPlansEmptyBody)
        else
          for (final (index, plan) in overview.plans.indexed) ...[
            if (index > 0) SizedBox(height: tokens.md),
            _PlanCard(
              plan: plan,
              interval: interval,
              current: plan.id == overview.subscription?.planId,
            ),
          ],
      ],
    );
  }
}

String _limitSummary(AppLocalizations l10n, AppFormats formats, PlanLimit limit) {
  final max = limit.max;
  if (max == null) return l10n.billingUnlimited;
  return l10n.billingLimitUpTo(billingLimitValue(l10n, formats, limit.key, max));
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.interval, required this.current});

  final Plan plan;
  final String interval;
  final bool current;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final price = plan.priceFor(interval) ?? (plan.prices.isNotEmpty ? plan.prices.first : null);
    final description = plan.description;

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(plan.name, style: text.titleMedium)),
              if (current) StatusBadge(label: l10n.billingCurrentBadge, tone: StatusTone.info),
            ],
          ),
          SizedBox(height: tokens.xs),
          Text(
            price == null ? l10n.billingCustomPrice : billingPriceLabel(l10n, formats, price),
            style: text.headlineSmall?.copyWith(color: tokens.primary),
          ),
          if (description != null && description.isNotEmpty) ...[
            SizedBox(height: tokens.sm),
            Text(description, style: text.bodyMedium?.copyWith(color: tokens.muted)),
          ],
          if (!plan.entitlements.isEmpty) ...[
            SizedBox(height: tokens.md),
            for (final limit in plan.entitlements.limits.take(4))
              Padding(
                padding: EdgeInsets.only(bottom: tokens.xs),
                child: Row(
                  children: [
                    Icon(Icons.check, size: 16, color: tokens.secondary),
                    SizedBox(width: tokens.sm),
                    Expanded(
                      child: Text(
                        '${billingLimitLabel(l10n, limit.key)} · ${_limitSummary(l10n, formats, limit)}',
                        style: text.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
