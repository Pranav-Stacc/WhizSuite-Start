import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'status_badge.dart';

/// Bordered card with consistent padding and an optional tap target.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({required this.child, this.onTap, this.padding, this.semanticLabel, super.key});

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final content = Padding(padding: padding ?? EdgeInsets.all(tokens.lg), child: child);
    return Semantics(
      container: true,
      button: onTap != null,
      label: semanticLabel,
      child: Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: onTap == null ? content : InkWell(onTap: onTap, child: content),
      ),
    );
  }
}

/// Uppercase eyebrow title with an optional trailing action.
class SectionHeader extends StatelessWidget {
  const SectionHeader({required this.title, this.trailing, super.key});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final style = Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted, letterSpacing: 0.8);
    return Padding(
      padding: EdgeInsets.only(bottom: tokens.sm),
      child: Row(
        children: [
          Expanded(child: Semantics(header: true, child: Text(title.toUpperCase(), style: style))),
          ?trailing,
        ],
      ),
    );
  }
}

/// Titled card grouping related content on detail screens.
class SectionCard extends StatelessWidget {
  const SectionCard({required this.title, required this.child, this.trailing, super.key});

  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(title: title, trailing: trailing),
          SurfaceCard(child: child),
        ],
      );
}

/// Label/value pair for detail screens.
class InfoRow extends StatelessWidget {
  const InfoRow({required this.label, required this.value, this.icon, this.alignEnd = true, super.key});

  final String label;
  final Widget value;
  final IconData? icon;

  /// When false, values (buttons, links) start-align instead of end-align.
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[Icon(icon, size: 18, color: tokens.muted), SizedBox(width: tokens.md)],
          Expanded(flex: 2, child: Text(label, style: text.bodyMedium?.copyWith(color: tokens.muted))),
          SizedBox(width: tokens.md),
          Expanded(
            flex: 3,
            child: Align(
              alignment: alignEnd ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
              child: DefaultTextStyle.merge(
                style: text.bodyMedium,
                textAlign: alignEnd ? TextAlign.end : TextAlign.start,
                child: value,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// KPI tile: label, big value, optional caption and accent.
class MetricTile extends StatelessWidget {
  const MetricTile({
    required this.label,
    required this.value,
    this.icon,
    this.caption,
    this.tone = StatusTone.neutral,
    this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? caption;
  final StatusTone tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final accent = tone == StatusTone.neutral ? tokens.secondary : tone.color(tokens);
    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.fromLTRB(tokens.sm + 2, tokens.sm, tokens.sm + 2, tokens.sm),
      semanticLabel: '$label: $value',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.labelSmall?.copyWith(
                      color: tokens.muted,
                      letterSpacing: 0.3,
                      fontWeight: FontWeight.w500,
                      fontSize: 11,
                    ),
                  ),
                ),
                if (icon != null) Icon(icon, size: 14, color: accent),
              ],
            ),
            SizedBox(height: tokens.xs),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: AlignmentDirectional.centerStart,
              child: Text(
                value,
                style: text.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                  height: 1.1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            if (caption != null) ...[
              SizedBox(height: 2),
              Text(
                caption!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: text.labelSmall?.copyWith(
                  color: tone == StatusTone.neutral ? tokens.muted : accent,
                  fontSize: 10,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Rows separated by hairline dividers — shared by overview sections and search groups.
class HairlineList extends StatelessWidget {
  const HairlineList({required this.children, super.key});

  static const _dividerAlpha = 0.6;

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final divider = context.tokens.border.withValues(alpha: _dividerAlpha);
    return Column(
      children: [
        for (final (i, child) in children.indexed) ...[
          if (i > 0) Divider(height: 1, color: divider),
          child,
        ],
      ],
    );
  }
}

/// Thin progress bar with an accessible value.
class ProgressMeter extends StatelessWidget {
  const ProgressMeter({required this.value, this.tone = StatusTone.neutral, this.label, super.key});

  static const _height = 6.0;

  /// 0..1
  final double value;
  final StatusTone tone;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = tone == StatusTone.neutral ? tokens.primary : tone.color(tokens);
    return Semantics(
      label: label,
      value: '${(value.clamp(0, 1) * 100).round()}%',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_height),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: value.clamp(0, 1)),
          duration: AppMotion.slow,
          curve: AppMotion.emphasized,
          builder: (context, animated, _) => LinearProgressIndicator(
            value: animated,
            minHeight: _height,
            backgroundColor: tokens.subtle,
            color: color,
          ),
        ),
      ),
    );
  }
}

/// Number of columns for a responsive grid of tiles at least [minTileWidth] wide.
int gridColumns(double width, {double minTileWidth = 280, int max = 4}) =>
    (width / minTileWidth).floor().clamp(1, max);
