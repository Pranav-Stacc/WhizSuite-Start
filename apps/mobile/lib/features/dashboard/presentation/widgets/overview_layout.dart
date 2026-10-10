import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/widgets/skeleton.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';

/// Width at which overview screens switch from one column to a multi-column layout.
const double overviewWideBreakpoint = 840;

/// Scrolling, width-capped overview body with pull-to-refresh.
class OverviewScrollView extends StatelessWidget {
  const OverviewScrollView({required this.children, required this.onRefresh, super.key});

  static const maxWidth = 1280.0;

  final List<Widget> children;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.xxl),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: maxWidth),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
            ),
          ),
        ],
      ),
    );
  }
}

/// Masonry-like section layout: a single column on phones, 2–3 columns from
/// [overviewWideBreakpoint], filled round-robin so reading order is preserved.
class OverviewColumns extends StatelessWidget {
  const OverviewColumns({required this.children, this.staggerOffset = 0, super.key});

  static const _minColumnWidth = 380.0;
  static const _maxColumns = 3;

  final List<Widget> children;

  /// Index the [FadeSlideIn] stagger starts from.
  final int staggerOffset;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final gap = tokens.lg;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width < overviewWideBreakpoint
            ? 1
            : gridColumns(width, minTileWidth: _minColumnWidth, max: _maxColumns).clamp(2, _maxColumns);
        final animated = [
          for (final (i, child) in children.indexed) FadeSlideIn(index: staggerOffset + i, child: child),
        ];
        if (columns == 1) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, child) in animated.indexed) ...[if (i > 0) SizedBox(height: gap), child],
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var column = 0; column < columns; column++) ...[
              if (column > 0) SizedBox(width: gap),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = column; i < animated.length; i += columns) ...[
                      if (i >= columns) SizedBox(height: gap),
                      animated[i],
                    ],
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

/// Responsive grid of KPI tiles (two per row on phones, denser gaps).
class MetricGrid extends StatelessWidget {
  const MetricGrid({required this.tiles, required this.semanticLabel, super.key});

  static const _minTileWidth = 120.0;
  static const _maxColumns = 4;
  static const _minColumns = 2;

  final List<Widget> tiles;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (tiles.isEmpty) return const SizedBox.shrink();
    final gap = tokens.sm;
    return Semantics(
      container: true,
      label: semanticLabel,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: _maxColumns)
              .clamp(_minColumns, _maxColumns)
              .clamp(1, tiles.length);
          final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final (i, tile) in tiles.indexed) SizedBox(width: width, child: FadeSlideIn(index: i + 1, child: tile)),
            ],
          );
        },
      ),
    );
  }
}

/// [MetricTile] driven by an [AsyncValue]: skeleton while loading, retry on failure.
class AsyncMetricTile<T> extends StatelessWidget {
  const AsyncMetricTile({
    required this.label,
    required this.icon,
    required this.value,
    required this.onRetry,
    required this.present,
    this.onTap,
    super.key,
  });

  final String label;
  final IconData icon;
  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final ({String value, String? caption, StatusTone tone}) Function(T data) present;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final current = value.value;
    if (current != null || (value.hasValue && !value.isLoading)) {
      final shown = present(current as T);
      return MetricTile(
        label: label,
        icon: icon,
        value: shown.value,
        caption: shown.caption,
        tone: shown.tone,
        onTap: onTap,
      );
    }
    if (value.hasError) {
      return MetricTile(
        label: label,
        icon: icon,
        value: l10n.valueUnknown,
        caption: l10n.dashboardKpiRetry,
        tone: StatusTone.danger,
        onTap: onRetry,
      );
    }
    return _MetricSkeleton(label: label, icon: icon);
  }
}

class _MetricSkeleton extends StatelessWidget {
  const _MetricSkeleton({required this.label, required this.icon});

  static const _valueHeight = 18.0;
  static const _valueWidth = 40.0;
  static const _captionWidth = 64.0;

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return SurfaceCard(
      padding: EdgeInsets.fromLTRB(tokens.sm + 2, tokens.sm, tokens.sm + 2, tokens.sm),
      semanticLabel: label,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.labelSmall?.copyWith(color: tokens.muted, fontSize: 11),
                ),
              ),
              Icon(icon, size: 14, color: tokens.border),
            ],
          ),
          SizedBox(height: tokens.xs),
          const Shimmer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: _valueWidth, height: _valueHeight),
                SizedBox(height: 4),
                SkeletonBox(width: _captionWidth, height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
