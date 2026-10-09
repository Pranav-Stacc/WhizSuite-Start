import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import '../application/reports_controller.dart';
import '../domain/metric_series.dart';
import '../domain/report_snapshot.dart';
import 'metric_chart.dart';

String metricName(AppLocalizations l10n, String key) => l10n.reportMetricName(key, humanizeKey(key));

IconData metricIcon(String key) => switch (key) {
  'reach' => Icons.visibility_outlined,
  'engagement' => Icons.favorite_border,
  'followers' => Icons.group_outlined,
  'impressions' => Icons.remove_red_eye_outlined,
  _ => Icons.insights_outlined,
};

/// Social performance over 7/30/90 days: KPI tiles with period-over-period change and a chart per metric.
class AnalyticsView extends ConsumerStatefulWidget {
  const AnalyticsView({super.key});

  @override
  ConsumerState<AnalyticsView> createState() => _AnalyticsViewState();
}

class _AnalyticsViewState extends ConsumerState<AnalyticsView> {
  int _days = analyticsDefaultRange;
  String? _clientId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final session = ref.watch(sessionProvider).value;
    final isPortal = session?.isClientPortal ?? false;
    // Channels are matched to clients through social accounts, which need content.view.
    final canPickClient = ref.watch(
      accessPolicyProvider.select((p) => p.can(Permissions.clientsView) && p.can(Permissions.contentView)),
    );
    final clients = canPickClient && !isPortal
        ? ref.watch(clientDirectoryProvider).value ?? Directory.empty
        : Directory.empty;
    final clientId = isPortal ? session?.clientId : _clientId;
    final query = (days: _days, clientId: clientId);
    final series = ref.watch(analyticsProvider(query));
    final clientIds = clients.entries.map((c) => c.id).toList()
      ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));

    final controls = Wrap(
      spacing: tokens.md,
      runSpacing: tokens.sm,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        SegmentedButton<int>(
          showSelectedIcon: false,
          segments: [
            for (final days in analyticsRanges)
              ButtonSegment(
                value: days,
                label: Text(l10n.reportRangeDays(days)),
                tooltip: l10n.reportRangeTooltip(days),
              ),
          ],
          selected: {_days},
          onSelectionChanged: (selection) => setState(() => _days = selection.first),
        ),
        if (clientIds.isNotEmpty)
          MenuFilterChip<String>(
            label: l10n.reportClient,
            icon: Icons.business_outlined,
            options: clientIds,
            selected: _clientId,
            labelOf: (id) => clients.nameOf(id) ?? l10n.reportClientUnknown,
            onSelected: (id) => setState(() => _clientId = id),
          ),
      ],
    );

    return AsyncValueView<List<MetricSeries>>(
      value: series,
      onRetry: () => ref.invalidate(analyticsProvider(query)),
      loading: ReadableBody(
        children: [
          controls,
          SizedBox(height: tokens.lg),
          const SizedBox(height: MetricChart.height * 2, child: SkeletonList(itemCount: 3)),
        ],
      ),
      isEmpty: (list) => list.isEmpty,
      empty: ReadableBody(
        onRefresh: () => ref.refresh(analyticsProvider(query).future),
        children: [
          controls,
          EmptyState(
            icon: Icons.insights_outlined,
            title: l10n.reportAnalyticsEmpty,
            body: l10n.reportAnalyticsEmptyBody(_days),
            action: _days == analyticsRanges.last
                ? null
                : OutlinedButton(
                    onPressed: () => setState(() => _days = analyticsRanges.last),
                    child: Text(l10n.reportRangeTooltip(analyticsRanges.last)),
                  ),
          ),
        ],
      ),
      data: (list) => ReadableBody(
        onRefresh: () => ref.refresh(analyticsProvider(query).future),
        children: [
          FadeSlideIn(child: controls),
          SizedBox(height: tokens.lg),
          FadeSlideIn(
            index: 1,
            child: _KpiGrid(series: list, days: _days),
          ),
          SizedBox(height: tokens.xl),
          for (final (index, item) in list.indexed) ...[
            FadeSlideIn(
              index: index + 2,
              child: _MetricCard(series: item),
            ),
            SizedBox(height: tokens.lg),
          ],
        ],
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.series, required this.days});

  static const _minTileWidth = 180.0;

  final List<MetricSeries> series;
  final int days;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: 4);
        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
        return Wrap(
          spacing: tokens.md,
          runSpacing: tokens.md,
          children: [
            for (final item in series)
              SizedBox(
                width: width,
                child: MetricTile(
                  label: metricName(l10n, item.key),
                  icon: metricIcon(item.key),
                  value: formats.number(item.total, compact: true),
                  caption: switch (item.change) {
                    final change? => l10n.reportChange(
                      formats.percent(change.abs()),
                      change >= 0 ? 'up' : 'down',
                      days,
                    ),
                    null => l10n.reportNoComparison,
                  },
                  tone: switch (item.change) {
                    final change? when change > 0 => StatusTone.success,
                    final change? when change < 0 => StatusTone.danger,
                    _ => StatusTone.neutral,
                  },
                ),
              ),
          ],
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.series});

  final MetricSeries series;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final name = metricName(l10n, series.key);
    return SectionCard(
      title: name,
      trailing: Text(
        series.isGauge
            ? l10n.reportLatest(context.formats.number(series.total))
            : l10n.reportTotal(context.formats.number(series.total)),
        style: Theme.of(
          context,
        ).textTheme.labelMedium?.copyWith(color: tokens.secondary, fontFeatures: const [FontFeature.tabularFigures()]),
      ),
      child: MetricChart(series: series, name: name),
    );
  }
}
