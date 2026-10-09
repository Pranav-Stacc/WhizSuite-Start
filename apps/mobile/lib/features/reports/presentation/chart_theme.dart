import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';

/// Monochrome chart styling from the theme tokens: muted axis labels, border-coloured grid,
/// surface tooltips. Shared by every chart so none falls back to fl_chart's default palette.
class ChartTheme {
  ChartTheme.of(BuildContext context) : tokens = context.tokens, _text = Theme.of(context).textTheme;

  static const gridStroke = 1.0;
  static const gridDash = [3, 3];
  static const axisReservedSize = 28.0;
  static const leftReservedSize = 40.0;
  static const tooltipPadding = EdgeInsets.symmetric(horizontal: 10, vertical: 6);

  final AppTokens tokens;
  final TextTheme _text;

  /// Series colour; the primary token keeps charts on-brand without a rainbow palette.
  Color get series => tokens.primary;

  /// Faded fill under lines and for inactive bars.
  Color get seriesSoft => tokens.primary.withValues(alpha: 0.18);

  TextStyle? get axisLabel =>
      _text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: const [FontFeature.tabularFigures()]);

  TextStyle? get tooltipLabel => _text.labelMedium?.copyWith(color: tokens.fg, fontWeight: FontWeight.w600);

  FlLine gridLine(double _) => FlLine(color: tokens.border, strokeWidth: gridStroke, dashArray: gridDash);

  FlGridData get grid => FlGridData(drawVerticalLine: false, getDrawingHorizontalLine: gridLine);

  FlBorderData get border => FlBorderData(
    show: true,
    border: Border(bottom: BorderSide(color: tokens.border)),
  );

  Color tooltipBackground(Object? _) => tokens.surface;

  BorderSide get tooltipBorder => BorderSide(color: tokens.border);

  BorderRadius get tooltipRadius => BorderRadius.circular(tokens.radius + 4);

  AxisTitles get hidden => const AxisTitles();

  /// Axis label widget for fl_chart's `getTitlesWidget`.
  Widget axisText(TitleMeta meta, String label) => SideTitleWidget(
    meta: meta,
    child: Text(label, style: axisLabel),
  );
}
