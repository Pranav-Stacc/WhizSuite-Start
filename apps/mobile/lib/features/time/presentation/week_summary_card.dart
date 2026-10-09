import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../reports/presentation/chart_theme.dart';
import '../domain/time_week.dart';

/// Week navigation, totals and an hours-per-day bar chart.
class WeekSummaryCard extends StatelessWidget {
  const WeekSummaryCard({
    required this.summary,
    required this.onPrevious,
    required this.onNext,
    required this.onToday,
    super.key,
  });

  static const _chartHeight = 168.0;

  final WeekSummary summary;
  final VoidCallback onPrevious;
  final VoidCallback? onNext;

  /// Null when the current week is already shown.
  final VoidCallback? onToday;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final days = weekDays(summary.start);
    final range = l10n.timeWeekRange(formats.shortDate(days.first), formats.shortDate(days.last));

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(tooltip: l10n.timeWeekPrevious, onPressed: onPrevious, icon: const Icon(Icons.chevron_left)),
              Expanded(
                child: Semantics(
                  header: true,
                  liveRegion: true,
                  child: Text(range, textAlign: TextAlign.center, style: text.titleSmall),
                ),
              ),
              IconButton(tooltip: l10n.timeWeekNext, onPressed: onNext, icon: const Icon(Icons.chevron_right)),
            ],
          ),
          if (onToday != null)
            Center(
              child: TextButton(onPressed: onToday, child: Text(l10n.timeWeekCurrent)),
            ),
          SizedBox(height: tokens.sm),
          Row(
            children: [
              Expanded(
                child: _Figure(label: l10n.timeWeekTotal, value: formats.duration(summary.totalMinutes)),
              ),
              Expanded(
                child: _Figure(
                  label: l10n.timeBillable,
                  value: summary.totalMinutes == 0 ? l10n.valueUnknown : formats.percent(summary.billableRatio),
                  caption: summary.totalMinutes == 0 ? null : formats.duration(summary.billableMinutes),
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          ProgressMeter(value: summary.billableRatio, tone: StatusTone.success, label: l10n.timeBillable),
          SizedBox(height: tokens.lg),
          SizedBox(
            height: _chartHeight,
            child: _HoursChart(summary: summary, days: days),
          ),
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.label, required this.value, this.caption});

  final String label;
  final String value;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final caption = this.caption;
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: text.labelMedium?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.xs),
          Text(
            value,
            style: text.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (caption != null) Text(caption, style: text.bodySmall?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }
}

class _HoursChart extends StatelessWidget {
  const _HoursChart({required this.summary, required this.days});

  static const _barWidth = 18.0;
  static const _minAxisHours = 8.0;
  static const _headroom = 1.15;
  static const _hourStep = 2.0;

  final WeekSummary summary;
  final List<DateTime> days;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final chart = ChartTheme.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final dayLabel = DateFormat.E(locale);
    final today = DateUtils.dateOnly(DateTime.now());
    final hours = summary.hoursPerDay;
    final peak = hours.fold<double>(0, (a, b) => a > b ? a : b);
    final maxY = (peak * _headroom).clamp(_minAxisHours, double.infinity);
    final semantics = l10n.timeWeekChartSemantics(
      [
        for (final (i, day) in days.indexed) '${formats.weekday(day)} ${formats.duration(summary.minutesPerDay[i])}',
      ].join(', '),
    );

    return Semantics(
      label: semantics,
      excludeSemantics: true,
      child: BarChart(
        BarChartData(
          maxY: maxY,
          minY: 0,
          alignment: BarChartAlignment.spaceAround,
          gridData: chart.grid.copyWith(horizontalInterval: _hourStep),
          borderData: chart.border,
          titlesData: FlTitlesData(
            topTitles: chart.hidden,
            rightTitles: chart.hidden,
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: ChartTheme.leftReservedSize,
                interval: _hourStep,
                getTitlesWidget: (value, meta) => chart.axisText(meta, l10n.durationHours(value.round())),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: ChartTheme.axisReservedSize,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= days.length) return const SizedBox.shrink();
                  return chart.axisText(meta, dayLabel.format(days[index]));
                },
              ),
            ),
          ),
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: chart.tooltipBackground,
              tooltipBorder: chart.tooltipBorder,
              tooltipBorderRadius: chart.tooltipRadius,
              tooltipPadding: ChartTheme.tooltipPadding,
              getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                '${formats.weekday(days[group.x])}\n${formats.duration(summary.minutesPerDay[group.x])}',
                chart.tooltipLabel ?? const TextStyle(),
              ),
            ),
          ),
          barGroups: [
            for (final (i, value) in hours.indexed)
              BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: value,
                    width: _barWidth,
                    color: days[i] == today ? chart.series : chart.series.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(chart.tokens.radius + 2)),
                    backDrawRodData: BackgroundBarChartRodData(show: true, toY: maxY, color: chart.tokens.subtle),
                  ),
                ],
              ),
          ],
        ),
        duration: AppMotion.slow,
        curve: AppMotion.emphasized,
      ),
    );
  }
}
