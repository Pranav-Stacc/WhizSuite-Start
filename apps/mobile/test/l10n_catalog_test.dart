import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Pulse (and other feature) strings live in `l10n/*.arb` and must be merged into
/// `lib/l10n/app_en.arb` before `flutter gen-l10n`. Run `dart run tool/l10n.dart`.
void main() {
  test('merged template includes shell and Pulse labels', () {
    final template = File('lib/l10n/app_en.arb').readAsStringSync();
    final json = jsonDecode(template) as Map<String, Object?>;
    expect(json.containsKey('navMenu'), isTrue);
    expect(json.containsKey('navPulse'), isTrue);
    expect(json.containsKey('pulseTodayTitle'), isTrue);
    expect(json.containsKey('quickCreateTitle'), isTrue);
  });

  test('generated localizations expose navPulse', () {
    final generated = File('lib/l10n/app_localizations.dart').readAsStringSync();
    expect(generated.contains('String get navPulse'), isTrue);
  });
}
