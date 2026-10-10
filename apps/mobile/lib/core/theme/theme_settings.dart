import 'dart:math' as math;

import 'package:flutter/painting.dart';

import '../contracts/contracts.g.dart';

enum ThemeDensity {
  comfortable(ThemeDensities.comfortable, 1),
  compact(ThemeDensities.compact, themeCompactDensityFactor);

  const ThemeDensity(this.key, this.factor);

  final String key;
  final double factor;

  static ThemeDensity? fromKey(Object? key) => values.where((d) => d.key == key).firstOrNull;
}

/// Mirrors the web `ThemeSettings` contract; presets and bounds come from `packages/contracts`.
class ThemeSettings {
  const ThemeSettings({
    required this.bg,
    required this.surface,
    required this.border,
    required this.primary,
    required this.secondary,
    required this.fg,
    required this.muted,
    required this.radius,
    required this.density,
  });

  /// Returns null unless every field is present and within the contract bounds.
  static ThemeSettings? tryParse(Map<String, Object?> json) {
    final colors = {for (final key in ThemeColorKeys.values) key: parseHexColor(json[key])};
    final radius = json['radius'];
    final density = ThemeDensity.fromKey(json['density']);
    if (colors.values.any((c) => c == null) || radius is! num || density == null) return null;
    if (radius < themeRadiusMin || radius > themeRadiusMax) return null;
    return ThemeSettings(
      bg: colors[ThemeColorKeys.bg]!,
      surface: colors[ThemeColorKeys.surface]!,
      border: colors[ThemeColorKeys.border]!,
      primary: colors[ThemeColorKeys.primary]!,
      secondary: colors[ThemeColorKeys.secondary]!,
      fg: colors[ThemeColorKeys.fg]!,
      muted: colors[ThemeColorKeys.muted]!,
      radius: radius.toDouble(),
      density: density,
    );
  }

  final Color bg;
  final Color surface;
  final Color border;
  final Color primary;
  final Color secondary;
  final Color fg;
  final Color muted;
  final double radius;
  final ThemeDensity density;

  Color colorFor(String key) => switch (key) {
        ThemeColorKeys.bg => bg,
        ThemeColorKeys.surface => surface,
        ThemeColorKeys.border => border,
        ThemeColorKeys.primary => primary,
        ThemeColorKeys.secondary => secondary,
        ThemeColorKeys.fg => fg,
        ThemeColorKeys.muted => muted,
        _ => throw ArgumentError.value(key, 'key', 'Unknown theme colour'),
      };

  ThemeSettings withColor(String key, Color color) => ThemeSettings(
        bg: key == ThemeColorKeys.bg ? color : bg,
        surface: key == ThemeColorKeys.surface ? color : surface,
        border: key == ThemeColorKeys.border ? color : border,
        primary: key == ThemeColorKeys.primary ? color : primary,
        secondary: key == ThemeColorKeys.secondary ? color : secondary,
        fg: key == ThemeColorKeys.fg ? color : fg,
        muted: key == ThemeColorKeys.muted ? color : muted,
        radius: radius,
        density: density,
      );

  ThemeSettings copyWith({double? radius, ThemeDensity? density}) => ThemeSettings(
        bg: bg,
        surface: surface,
        border: border,
        primary: primary,
        secondary: secondary,
        fg: fg,
        muted: muted,
        radius: radius ?? this.radius,
        density: density ?? this.density,
      );

  Map<String, Object> toJson() => {
        for (final key in ThemeColorKeys.values) key: toHex(colorFor(key)),
        'radius': radius,
        'density': density.key,
      };

  bool get isLight => isLightColor(bg);

  @override
  bool operator ==(Object other) =>
      other is ThemeSettings &&
      other.bg == bg &&
      other.surface == surface &&
      other.border == border &&
      other.primary == primary &&
      other.secondary == secondary &&
      other.fg == fg &&
      other.muted == muted &&
      other.radius == radius &&
      other.density == density;

  @override
  int get hashCode => Object.hash(bg, surface, border, primary, secondary, fg, muted, radius, density);
}

class ThemePreset {
  const ThemePreset(this.id, this.mode, this.settings);

  final String id;
  /// `light` | `dark` — mirrors contracts `ThemePreset.mode`.
  final String mode;
  final ThemeSettings settings;

  bool get isLight => mode == 'light';
}

/// Shared-contract default theme (dark mono — matches web cookie default).
final ThemeSettings contractDefaultThemeSettings = ThemeSettings.tryParse(defaultTheme)!;

final List<ThemePreset> themePresetList = [
  for (final raw in themePresets.cast<Map<String, Object>>())
    ThemePreset(
      raw['id']! as String,
      raw['mode']! as String,
      ThemeSettings.tryParse(raw['theme']! as Map<String, Object>)!,
    ),
];

/// Mobile boot default when nothing is persisted — dark mono, compact for phones.
final ThemeSettings defaultThemeSettings =
    contractDefaultThemeSettings.copyWith(density: ThemeDensity.compact);

Color? parseHexColor(Object? value) {
  if (value is! String || !RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(value)) return null;
  return Color(0xFF000000 | int.parse(value.substring(1), radix: 16));
}

String toHex(Color color) =>
    '#${(color.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

double _channel(double c) => c <= 0.03928 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();

/// WCAG relative luminance, identical to the web implementation.
double relativeLuminance(Color color) =>
    0.2126 * _channel(color.r) + 0.7152 * _channel(color.g) + 0.0722 * _channel(color.b);

bool isLightColor(Color color) => relativeLuminance(color) > themeLightLuminanceThreshold;

final Color _contrastDark = parseHexColor(themeContrastDark)!;
final Color _contrastLight = parseHexColor(themeContrastLight)!;

/// Readable foreground for content drawn on [background].
Color contrastOn(Color background) => isLightColor(background) ? _contrastDark : _contrastLight;

/// Semantic status colours shared with the web (success, warning, danger, info, violet, pink).
abstract final class StatusColors {
  static final Color success = parseHexColor(ThemeStatusColors.success)!;
  static final Color warning = parseHexColor(ThemeStatusColors.warning)!;
  static final Color danger = parseHexColor(ThemeStatusColors.danger)!;
  static final Color info = parseHexColor(ThemeStatusColors.info)!;
  static final Color violet = parseHexColor(ThemeStatusColors.violet)!;
  static final Color pink = parseHexColor(ThemeStatusColors.pink)!;
}
