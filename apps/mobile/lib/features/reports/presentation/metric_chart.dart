import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/metric_series.dart';
import 'chart_theme.dart';

/// Daily chart for one metric: a line for levels (gauges), bars for daily amounts.
class MetricChart extends StatelessWidget {
  const MetricChart({required this.series, required this.name, super.key});

  static const height = 200.0;

  /// Roughly how many date labels fit under the chart.
  static const _bottomLabels = 6;
  static const _leftLabels = 4;
  static const _headroom = 1.1;
  static const _lineWidth = 2.5;
  static const _maxBarWidth = 16.0;
  static const _barFill = 0.6;

  final MetricSeries series;
  final String name;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final chart = ChartTheme.of(context);
    final days = series.daily.length;
    final maxY = math.max(series.peak * _headroom, 1).toDouble();
    final yStep = maxY / _leftLabels;
    final xStep = math.max(1, (days / _bottomLabels).ceil());

    String valueAt(int index) => formats.number(series.daily[index]);
    String dayAt(int index) => formats.shortDate(series.dayAt(index));

    final titles = FlTitlesData(
      topTitles: chart.hidden,
      rightTitles: chart.hidden,
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: ChartTheme.leftReservedSize,
          interval: yStep,
          getTitlesWidget: (value, meta) =>
              value == meta.max ? const SizedBox.shrink() : chart.axisText(meta, formats.number(value, compact: true)),
        ),
      ),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: ChartTheme.axisReservedSize,
          interval: 1,
          getTitlesWidget: (value, meta) {
            final index = value.round();
            if (index < 0 || index >= days || index % xStep != 0) {
              return const SizedBox.shrink();
            }
            return chart.axisText(meta, dayAt(index));
          },
        ),
      ),
    );

    final summary = l10n.reportChartSemantics(name, days, formats.number(series.total), formats.number(series.peak));

    return Semantics(
      label: summary,
      excludeSemantics: true,
      child: SizedBox(
        height: height,
        child: series.isGauge
            ? LineChart(
                LineChartData(
                  minY: 0,
                  maxY: maxY,
                  minX: 0,
                  maxX: (days - 1).toDouble(),
                  gridData: chart.grid.copyWith(horizontalInterval: yStep),
                  borderData: chart.border,
                  titlesData: titles,
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipColor: chart.tooltipBackground,
                      tooltipBorder: chart.tooltipBorder,
                      tooltipBorderRadius: chart.tooltipRadius,
                      tooltipPadding: ChartTheme.tooltipPadding,
                      getTooltipItems: (spots) => [
                        for (final spot in spots)
                          LineTooltipItem(
                            '${dayAt(spot.x.toInt())}\n${valueAt(spot.x.toInt())}',
                            chart.tooltipLabel ?? const TextStyle(),
                          ),
                      ],
                    ),
                  ),
                  lineBarsData: [
                    LineChartBarData(
                      spots: [for (final (i, v) in series.daily.indexed) FlSpot(i.toDouble(), v)],
                      isCurved: true,
                      preventCurveOverShooting: true,
                      color: chart.series,
                      barWidth: _lineWidth,
                      isStrokeCapRound: true,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(show: true, color: chart.seriesSoft),
                    ),
                  ],
                ),
                duration: AppMotion.slow,
                curve: AppMotion.emphasized,
              )
            : LayoutBuilder(
                builder: (context, constraints) {
                  final slot = (constraints.maxWidth - ChartTheme.leftReservedSize) / days;
                  final barWidth = math.min(_maxBarWidth, math.max(1, slot * _barFill)).toDouble();
                  return BarChart(
                    BarChartData(
                      minY: 0,
                      maxY: maxY,
                      alignment: BarChartAlignment.spaceAround,
                      gridData: chart.grid.copyWith(horizontalInterval: yStep),
                      borderData: chart.border,
                      titlesData: titles,
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: chart.tooltipBackground,
                          tooltipBorder: chart.tooltipBorder,
                          tooltipBorderRadius: chart.tooltipRadius,
                          tooltipPadding: ChartTheme.tooltipPadding,
                          getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                            '${dayAt(group.x)}\n${valueAt(group.x)}',
                            chart.tooltipLabel ?? const TextStyle(),
                          ),
                        ),
                      ),
                      barGroups: [
                        for (final (i, v) in series.daily.indexed)
                          BarChartGroupData(
                            x: i,
                            barRods: [
                              BarChartRodData(
                                toY: v,
                                width: barWidth,
                                color: chart.series,
                                borderRadius: BorderRadius.vertical(top: Radius.circular(chart.tokens.radius)),
                              ),
                            ],
                          ),
                      ],
                    ),
                    duration: AppMotion.slow,
                    curve: AppMotion.emphasized,
                  );
                },
              ),
      ),
    );
  }
}
