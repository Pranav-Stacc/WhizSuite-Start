import 'package:flutter/material.dart';

import 'theme_settings.dart';

/// Design tokens available to every widget via `context.tokens`.
/// Spacing is scaled by the selected density, radius comes from the theme settings.
@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens({
    required this.bg,
    required this.surface,
    required this.border,
    required this.primary,
    required this.onPrimary,
    required this.secondary,
    required this.fg,
    required this.muted,
    required this.radius,
    required this.density,
  });

  factory AppTokens.from(ThemeSettings settings) => AppTokens(
        bg: settings.bg,
        surface: settings.surface,
        border: settings.border,
        primary: settings.primary,
        onPrimary: contrastOn(settings.primary),
        secondary: settings.secondary,
        fg: settings.fg,
        muted: settings.muted,
        radius: settings.radius,
        density: settings.density.factor,
      );

  static const double _unit = 4;

  final Color bg;
  final Color surface;
  final Color border;
  final Color primary;
  final Color onPrimary;
  final Color secondary;
  final Color fg;
  final Color muted;
  final double radius;
  final double density;

  double space(double steps) => _unit * steps * density;

  double get xs => space(1);
  double get sm => space(2);
  double get md => space(3);
  double get lg => space(4);
  double get xl => space(6);
  double get xxl => space(8);

  BorderRadius get borderRadius => BorderRadius.circular(radius);

  /// Faint fill for chips, inputs and skeletons, derived from the theme.
  Color get subtle => Color.lerp(surface, fg, 0.05)!;

  @override
  AppTokens copyWith() => this;

  @override
  AppTokens lerp(AppTokens? other, double t) {
    if (other == null) return this;
    return AppTokens(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      border: Color.lerp(border, other.border, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      secondary: Color.lerp(secondary, other.secondary, t)!,
      fg: Color.lerp(fg, other.fg, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      radius: radius + (other.radius - radius) * t,
      density: density + (other.density - density) * t,
    );
  }
}

/// Animation timings shared across the app.
abstract final class AppMotion {
  static const fast = Duration(milliseconds: 150);
  static const medium = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 400);
  static const shimmer = Duration(milliseconds: 1600);
  static const brandLoop = Duration(milliseconds: 2000);
  static const Curve standard = Curves.easeOutCubic;
  /// Same curve as the web `fade-up` / `slide-in` animations.
  static const Curve emphasized = Cubic(0.16, 1, 0.3, 1);
}

extension AppTokensContext on BuildContext {
  AppTokens get tokens => Theme.of(this).extension<AppTokens>()!;
}
