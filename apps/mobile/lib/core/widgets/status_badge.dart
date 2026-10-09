import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/theme_settings.dart';

/// Semantic colour of a status, shared with the web's status palette.
enum StatusTone {
  neutral,
  success,
  warning,
  danger,
  info,
  violet,
  pink;

  /// Accent colour; neutral follows the theme's muted text.
  Color color(AppTokens tokens) => switch (this) {
        StatusTone.neutral => tokens.muted,
        StatusTone.success => StatusColors.success,
        StatusTone.warning => StatusColors.warning,
        StatusTone.danger => StatusColors.danger,
        StatusTone.info => StatusColors.info,
        StatusTone.violet => StatusColors.violet,
        StatusTone.pink => StatusColors.pink,
      };
}

/// Pill with a status dot. Colour is never the only signal: the label is always shown.
class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.label, this.tone = StatusTone.neutral, this.dense = false, super.key});

  static const _dotSize = 6.0;
  static const _fillAlpha = 0.12;
  static const _borderAlpha = 0.28;

  final String label;
  final StatusTone tone;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = tone.color(tokens);
    final text = Theme.of(context).textTheme.labelSmall;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: dense ? tokens.sm : tokens.sm + 2, vertical: dense ? 2 : tokens.xs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: _fillAlpha),
        borderRadius: BorderRadius.circular(tokens.radius + 999),
        border: Border.all(color: color.withValues(alpha: _borderAlpha)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: _dotSize, height: _dotSize, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          SizedBox(width: tokens.xs + 2),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: text?.copyWith(color: tokens.fg, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small neutral tag (hashtag, platform, skill).
class TagChip extends StatelessWidget {
  const TagChip({required this.label, this.icon, super.key});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 2),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 4),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 12, color: tokens.secondary), SizedBox(width: tokens.xs)],
          Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.secondary)),
        ],
      ),
    );
  }
}
