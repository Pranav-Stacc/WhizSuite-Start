import 'dart:convert';

import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/preferences.dart';
import 'theme_settings.dart';

/// The device's appearance settings; persisted locally like the web `ao_theme_v2` cookie.
class ThemeController extends Notifier<ThemeSettings> {
  /// Bumped so existing installs pick up the mono default (radius 14) once.
  static const _storageKey = 'appearance.theme.v4';

  @override
  ThemeSettings build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(_storageKey);
    if (raw == null) return defaultThemeSettings;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?>) return defaultThemeSettings;
      return _coerceLegacyDefault(ThemeSettings.tryParse(decoded) ?? defaultThemeSettings);
    } on FormatException {
      return defaultThemeSettings;
    }
  }

  void applyPreset(ThemePreset preset) => _save(preset.settings);

  void setColor(String key, Color color) => _save(state.withColor(key, color));

  void setRadius(double radius) => _save(state.copyWith(radius: radius));

  void setDensity(ThemeDensity density) => _save(state.copyWith(density: density));

  void reset() => _save(defaultThemeSettings);

  /// Applies the agency theme after login so every team and client member sees the same colours.
  void hydrateFromOrganization(ThemeSettings theme) => _save(_coerceLegacyDefault(theme));

  void _save(ThemeSettings next) {
    final resolved = _coerceLegacyDefault(next);
    state = resolved;
    ref.read(sharedPreferencesProvider).setString(_storageKey, jsonEncode(resolved.toJson()));
  }

  /// Former product default was noir (radius 2). Upgrade those sessions to mono.
  ThemeSettings _coerceLegacyDefault(ThemeSettings theme) {
    final isLegacy = theme.radius == 2 &&
        toHex(theme.bg) == '#0E0E0D' &&
        toHex(theme.surface) == '#161615' &&
        toHex(theme.border) == '#2E2D2A' &&
        toHex(theme.primary) == '#F2F0EB' &&
        toHex(theme.secondary) == '#B8B5AE' &&
        toHex(theme.fg) == '#F2F0EB' &&
        toHex(theme.muted) == '#8C8A85';
    if (!isLegacy) return theme;
    return contractDefaultThemeSettings.copyWith(density: theme.density);
  }
}

final themeControllerProvider = NotifierProvider<ThemeController, ThemeSettings>(ThemeController.new);
