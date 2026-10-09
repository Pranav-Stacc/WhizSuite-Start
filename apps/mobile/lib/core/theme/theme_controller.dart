import 'dart:convert';

import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/preferences.dart';
import 'theme_settings.dart';

/// The device's appearance settings; persisted locally like the web `ao_theme` cookie.
class ThemeController extends Notifier<ThemeSettings> {
  /// Bumped so existing installs pick up the dark mobile default once.
  static const _storageKey = 'appearance.theme.v2';

  @override
  ThemeSettings build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(_storageKey);
    if (raw == null) return defaultThemeSettings;
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map<String, Object?> ? ThemeSettings.tryParse(decoded) ?? defaultThemeSettings : defaultThemeSettings;
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
  void hydrateFromOrganization(ThemeSettings theme) => _save(theme);

  void _save(ThemeSettings next) {
    state = next;
    ref.read(sharedPreferencesProvider).setString(_storageKey, jsonEncode(next.toJson()));
  }
}

final themeControllerProvider = NotifierProvider<ThemeController, ThemeSettings>(ThemeController.new);
