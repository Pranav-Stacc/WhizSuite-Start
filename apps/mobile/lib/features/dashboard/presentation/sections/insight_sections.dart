import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/formatting/formats.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/avatar.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../directory/application/directory_providers.dart';
import '../../../invoices/invoices_routes.dart';
import '../../../leads/leads_routes.dart';
import '../../../search/domain/entity_routes.dart';
import '../../application/dashboard_providers.dart';
import '../../domain/dashboard_models.dart';
import '../../domain/dashboard_summaries.dart';
import '../widgets/overview_charts.dart';
import '../widgets/overview_section.dart';

/// Rows shown in the activity timeline.
const int _activityLimit = 8;

/// Open pipeline value per stage as a horizontal bar list.
class PipelineSection extends ConsumerWidget {
  const PipelineSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    return OverviewSection<PipelineSummary>(
      title: l10n.dashboardPipelineTitle,
      trailing: ViewAllButton(onPressed: () => context.go(LeadsRoutes.root)),
      value: ref.watch(pipelineProvider),
      onRetry: () => ref.invalidate(dashboardLeadsProvider),
      skeletonRows: 4,
      builder: (context, pipeline) {
        if (pipeline.isEmpty) return SectionEmpty(message: l10n.dashboardPipelineEmpty, icon: Icons.filter_alt_outlined);
        final byValue = pipeline.stages.any((s) => s.valueMinor > 0);
        final peak = pipeline.stages.fold<int>(0, (max, s) => math.max(max, byValue ? s.valueMinor : s.count));
        String money(int minor) => formats.money(minor, currency: pipeline.currency, compact: true);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.dashboardPipelineCaption(money(pipeline.openMinor)),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
            ),
            SizedBox(height: tokens.md),
            StageBars(
              rows: [
                for (final stage in pipeline.stages)
                  (
                    label: l10n.dashboardLeadStage(stage.stage),
                    value: money(stage.valueMinor),
                    detail: l10n.dashboardDealCount(stage.count),
                    ratio: peak == 0 ? 0 : (byValue ? stage.valueMinor : stage.count) / peak,
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// Paid revenue per month as a bar chart.
class RevenueSection extends ConsumerWidget {
  const RevenueSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final locale = Localizations.localeOf(context).toLanguageTag();
    return OverviewSection<RevenueSeries>(
      title: l10n.dashboardRevenueTitle,
      trailing: ViewAllButton(onPressed: () => context.go(InvoicesRoutes.root)),
      value: ref.watch(revenueProvider),
      onRetry: () => ref.invalidate(dashboardInvoicesProvider),
      skeletonRows: 4,
      builder: (context, series) {
        if (series.totalMinor == 0) {
          return SectionEmpty(message: l10n.dashboardRevenueEmpty(series.months.length), icon: Icons.bar_chart);
        }
        String money(num minor) => formats.money(minor.round(), currency: series.currency, compact: true);
        final points = [
          for (final m in series.months) (label: DateFormat.MMM(locale).format(m.month), value: m.minor.toDouble()),
        ];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              formats.money(series.totalMinor, currency: series.currency),
              style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w600, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
            Text(
              l10n.dashboardRevenueCaption(series.months.length),
              style: text.bodySmall?.copyWith(color: tokens.muted),
            ),
            SizedBox(height: tokens.lg),
            OverviewBarChart(
              points: points,
              formatValue: money,
              semanticLabel: l10n.dashboardRevenueChart(points.map((p) => '${p.label} ${money(p.value)}').join(', ')),
            ),
          ],
        );
      },
    );
  }
}

/// Latest workspace activity as a timeline with actor avatars.
class ActivitySection extends ConsumerWidget {
  const ActivitySection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final members = ref.watch(memberDirectoryProvider).value;
    return OverviewSection<List<ActivityEntry>>(
      title: l10n.dashboardActivityTitle,
      value: ref.watch(dashboardActivityProvider),
      onRetry: () => ref.invalidate(dashboardActivityProvider),
      skeletonRows: 4,
      builder: (context, entries) {
        if (entries.isEmpty) return SectionEmpty(message: l10n.dashboardActivityEmpty, icon: Icons.history);
        final shown = entries.take(_activityLimit).toList();
        return Column(
          children: [
            for (final (i, entry) in shown.indexed)
              _TimelineEntry(
                entry: entry,
                actor: switch (entry.actorId) {
                  null => l10n.dashboardActivitySystem,
                  final id => members?.nameOf(id) ?? l10n.dashboardActivitySomeone,
                },
                isLast: i == shown.length - 1,
              ),
          ],
        );
      },
    );
  }
}

class _TimelineEntry extends StatelessWidget {
  const _TimelineEntry({required this.entry, required this.actor, required this.isLast});

  static const _avatarSize = 28.0;

  final ActivityEntry entry;
  final String actor;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final at = entry.createdAt;
    final when = at == null ? null : formats.relative(at);
    final route = entityRoute(entry.entityType, entry.entityId);
    final content = IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              InitialsAvatar(name: actor, seed: entry.actorId ?? actor, size: _avatarSize),
              if (!isLast) Expanded(child: Center(child: Container(width: 1, color: tokens.border))),
            ],
          ),
          SizedBox(width: tokens.md),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: tokens.xs, bottom: isLast ? 0 : tokens.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: actor, style: const TextStyle(fontWeight: FontWeight.w600)),
                        const TextSpan(text: ' '),
                        TextSpan(text: entry.summary, style: TextStyle(color: tokens.secondary)),
                      ],
                    ),
                    style: text.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (when != null) Text(when, style: text.labelSmall?.copyWith(color: tokens.muted)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
    return Semantics(
      button: route != null,
      label: [actor, entry.summary, ?when].join(', '),
      excludeSemantics: true,
      child: route == null
          ? content
          : InkWell(
              borderRadius: BorderRadius.circular(tokens.radius + 6),
              onTap: () => context.push(route),
              child: content,
            ),
    );
  }
}
