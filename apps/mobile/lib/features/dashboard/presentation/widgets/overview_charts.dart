import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_tokens.dart';

/// Rounds [value] up to 1, 2 or 5 × 10ⁿ so axis gridlines land on readable numbers.
double niceAxisMax(double value) {
  if (value <= 0) return 1;
  final magnitude = math.pow(10, (math.log(value) / math.ln10).floor()).toDouble();
  final fraction = value / magnitude;
  final nice = fraction <= 1
      ? 1
      : fraction <= 2
          ? 2
          : fraction <= 5
              ? 5
              : 10;
  return nice * magnitude;
}

typedef ChartPoint = ({String label, double value});

/// Monochrome vertical bar chart: muted axes, hairline grid, the latest bar emphasised.
class OverviewBarChart extends StatelessWidget {
  const OverviewBarChart({
    required this.points,
    required this.formatValue,
    required this.semanticLabel,
    super.key,
  });

  static const _height = 188.0;
  static const _barWidth = 18.0;
  static const _gridLines = 4;
  static const _leftReserved = 48.0;
  static const _bottomReserved = 26.0;
  static const _dimAlpha = 0.32;
  static const _gridDash = [3, 4];

  final List<ChartPoint> points;
  final String Function(double value) formatValue;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final axisStyle = text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: const [FontFeature.tabularFigures()]);
    final maxY = niceAxisMax(points.fold<double>(0, (max, p) => math.max(max, p.value)));
    final interval = maxY / _gridLines;
    final radius = Radius.circular(tokens.radius + 2);

    return Semantics(
      label: semanticLabel,
      child: ExcludeSemantics(
        child: SizedBox(
          height: _height,
          child: BarChart(
            duration: AppMotion.slow,
            curve: AppMotion.emphasized,
            BarChartData(
              maxY: maxY,
              minY: 0,
              alignment: BarChartAlignment.spaceAround,
              borderData: FlBorderData(show: false),
              gridData: FlGridData(
                drawVerticalLine: false,
                horizontalInterval: interval,
                getDrawingHorizontalLine: (_) => FlLine(color: tokens.border, strokeWidth: 1, dashArray: _gridDash),
              ),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(),
                rightTitles: const AxisTitles(),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: _leftReserved,
                    interval: interval,
                    getTitlesWidget: (value, meta) => SideTitleWidget(
                      meta: meta,
                      child: Text(formatValue(value), style: axisStyle),
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: _bottomReserved,
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      final label = index >= 0 && index < points.length ? points[index].label : '';
                      return SideTitleWidget(meta: meta, child: Text(label, style: axisStyle));
                    },
                  ),
                ),
              ),
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  getTooltipColor: (_) => tokens.fg,
                  tooltipBorderRadius: BorderRadius.circular(tokens.radius + 4),
                  fitInsideHorizontally: true,
                  fitInsideVertically: true,
                  getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                    '${points[group.x].label}\n',
                    TextStyle(color: tokens.bg.withValues(alpha: 0.7), fontSize: axisStyle?.fontSize),
                    children: [
                      TextSpan(
                        text: formatValue(rod.toY),
                        style: TextStyle(color: tokens.bg, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
              barGroups: [
                for (final (i, point) in points.indexed)
                  BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: point.value,
                        width: _barWidth,
                        color: i == points.length - 1 ? tokens.primary : tokens.primary.withValues(alpha: _dimAlpha),
                        borderRadius: BorderRadius.vertical(top: radius),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

typedef StageBar = ({String label, String value, String detail, double ratio});

/// Horizontal bar list (label, detail, value, proportional bar) — the web `HBarList`.
class StageBars extends StatelessWidget {
  const StageBars({required this.rows, super.key});

  static const _barHeight = 6.0;

  final List<StageBar> rows;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final figures = text.labelMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
    return Column(
      children: [
        for (final (i, row) in rows.indexed) ...[
          if (i > 0) SizedBox(height: tokens.md),
          Semantics(
            label: '${row.label}: ${row.value}, ${row.detail}',
            child: ExcludeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(row.label, style: text.bodyMedium, overflow: TextOverflow.ellipsis)),
                      Text(row.detail, style: text.labelSmall?.copyWith(color: tokens.muted)),
                      SizedBox(width: tokens.md),
                      Text(row.value, style: figures),
                    ],
                  ),
                  SizedBox(height: tokens.xs + 2),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(_barHeight),
                    child: Container(
                      height: _barHeight,
                      color: tokens.subtle,
                      alignment: AlignmentDirectional.centerStart,
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: row.ratio.clamp(0, 1)),
                        duration: AppMotion.slow,
                        curve: AppMotion.emphasized,
                        builder: (context, value, _) => FractionallySizedBox(
                          widthFactor: value,
                          heightFactor: 1,
                          child: ColoredBox(color: tokens.primary),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
