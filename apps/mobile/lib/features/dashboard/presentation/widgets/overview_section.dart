import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/error_message.dart';
import '../../../../core/widgets/skeleton.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';

/// Titled overview card that renders its own loading skeleton and a compact inline
/// retry, so one failing endpoint never takes the whole screen down.
class OverviewSection<T> extends StatelessWidget {
  const OverviewSection({
    required this.title,
    required this.value,
    required this.onRetry,
    required this.builder,
    this.trailing,
    this.skeletonRows = 3,
    super.key,
  });

  final String title;
  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(BuildContext context, T data) builder;
  final Widget? trailing;
  final int skeletonRows;

  @override
  Widget build(BuildContext context) {
    final current = value.value;
    final Widget child;
    if (current != null || (value.hasValue && !value.isLoading)) {
      child = builder(context, current as T);
    } else if (value.hasError) {
      child = InlineRetry(error: value.error ?? const Object(), onRetry: onRetry);
    } else {
      child = SectionSkeleton(rows: skeletonRows);
    }
    return SectionCard(
      title: title,
      trailing: trailing,
      child: AnimatedSize(duration: AppMotion.medium, curve: AppMotion.standard, alignment: Alignment.topCenter, child: child),
    );
  }
}

/// "View all" link for a section header.
class ViewAllButton extends StatelessWidget {
  const ViewAllButton({required this.onPressed, this.label, super.key});

  final VoidCallback onPressed;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [Text(label ?? l10n.viewAll), const SizedBox(width: 2), const Icon(Icons.arrow_forward, size: 14)],
      ),
    );
  }
}

/// One-line failure message with a retry button, sized to sit inside a card.
class InlineRetry extends StatelessWidget {
  const InlineRetry({required this.error, required this.onRetry, super.key});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Semantics(
      liveRegion: true,
      child: Row(
        children: [
          Icon(Icons.error_outline, size: 18, color: tokens.muted),
          SizedBox(width: tokens.sm),
          Expanded(
            child: Text(describeError(l10n, error), style: text.bodySmall?.copyWith(color: tokens.secondary)),
          ),
          TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 16), label: Text(l10n.retry)),
        ],
      ),
    );
  }
}

/// Placeholder rows shaped like [OverviewRow]s.
class SectionSkeleton extends StatelessWidget {
  const SectionSkeleton({this.rows = 3, super.key});

  static const _leadingSize = 32.0;
  static const _titleWidths = [0.7, 0.5, 0.62];

  final int rows;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Shimmer(
      child: Column(
        children: [
          for (var i = 0; i < rows; i++)
            Padding(
              padding: EdgeInsets.symmetric(vertical: tokens.sm),
              child: Row(
                children: [
                  SkeletonBox(width: _leadingSize, height: _leadingSize, radius: tokens.radius + 4),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FractionallySizedBox(widthFactor: _titleWidths[i % _titleWidths.length], child: const SkeletonBox()),
                        SizedBox(height: tokens.xs + 2),
                        const FractionallySizedBox(widthFactor: 0.35, child: SkeletonBox(height: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Quiet empty message inside a section.
class SectionEmpty extends StatelessWidget {
  const SectionEmpty({required this.message, this.icon = Icons.check_circle_outline, this.action, super.key});

  final String message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.md),
      child: Column(
        children: [
          Icon(icon, color: tokens.muted, size: 22),
          SizedBox(height: tokens.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
          ),
          if (action != null) ...[SizedBox(height: tokens.sm), action!],
        ],
      ),
    );
  }
}

/// Compact tappable list row: leading mark, title, subtitle and trailing badge.
class OverviewRow extends StatelessWidget {
  const OverviewRow({
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.semanticLabel,
    super.key,
  });

  static const _minHeight = 48.0;

  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final row = ConstrainedBox(
      constraints: const BoxConstraints(minHeight: _minHeight),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs + 2),
        child: Row(
          children: [
            if (leading != null) ...[leading!, SizedBox(width: tokens.md)],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                ],
              ),
            ),
            if (trailing != null) ...[SizedBox(width: tokens.sm), trailing!],
          ],
        ),
      ),
    );
    return Semantics(
      button: onTap != null,
      label: semanticLabel,
      excludeSemantics: semanticLabel != null,
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(tokens.radius + 6), child: row),
    );
  }
}

/// Small rounded icon tile leading an [OverviewRow].
class RowMark extends StatelessWidget {
  const RowMark({required this.icon, this.color, super.key});

  static const size = 32.0;
  static const _iconSize = 16.0;

  final IconData icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
      ),
      child: Icon(icon, size: _iconSize, color: color ?? tokens.secondary),
    );
  }
}

/// Weekday + day-of-month block leading a dated row.
class DateBlock extends StatelessWidget {
  const DateBlock({required this.date, super.key});

  static const _width = 40.0;

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final local = date.toLocal();
    return Container(
      width: _width,
      padding: EdgeInsets.symmetric(vertical: tokens.xs),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(DateFormat.E(locale).format(local).toUpperCase(), style: text.labelSmall?.copyWith(color: tokens.muted)),
          Text(DateFormat.d(locale).format(local), style: text.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Rows separated by hairlines, flush with the card edges.
class OverviewList extends StatelessWidget {
  const OverviewList({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => HairlineList(children: children);
}
