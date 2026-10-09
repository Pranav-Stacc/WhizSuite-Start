import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/core/theme/theme_settings.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ThemeSettings', () {
    test('parses every preset from the shared contract', () {
      expect(
        themePresetList.map((p) => p.id),
        containsAll(['editorial', 'chalk', 'porcelain', 'mist', 'daylight', 'sage', 'sky', 'linen', 'noir', 'mono']),
      );
      expect(themePresetList.where((p) => p.isLight).length, greaterThanOrEqualTo(8));
      expect(themePresetList.where((p) => !p.isLight).length, greaterThanOrEqualTo(6));
      expect(themePresetList.first.settings, contractDefaultThemeSettings);
      expect(defaultThemeSettings.isLight, isFalse);
      expect(defaultThemeSettings.density, ThemeDensity.compact);
    });

    test('round-trips through JSON in the web cookie format', () {
      final custom = contractDefaultThemeSettings.withColor(ThemeColorKeys.primary, const Color(0xFF38BDF8)).copyWith(
            radius: 12,
            density: ThemeDensity.compact,
          );
      final json = custom.toJson();

      expect(json[ThemeColorKeys.primary], '#38BDF8');
      expect(json['density'], ThemeDensities.compact);
      expect(ThemeSettings.tryParse(json), custom);
    });

    test('rejects out-of-range radius and malformed colours', () {
      final json = contractDefaultThemeSettings.toJson();
      expect(ThemeSettings.tryParse({...json, 'radius': themeRadiusMax + 1}), isNull);
      expect(ThemeSettings.tryParse({...json, ThemeColorKeys.bg: 'white'}), isNull);
    });

    test('contrastOn matches the web threshold', () {
      expect(toHex(contrastOn(const Color(0xFFFFFFFF))), themeContrastDark);
      expect(toHex(contrastOn(const Color(0xFF111111))), themeContrastLight);
      expect(contractDefaultThemeSettings.isLight, isTrue);
    });
  });
}
