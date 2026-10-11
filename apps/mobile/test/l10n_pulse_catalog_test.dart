import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Pulse ARB catalog is merged into generated AppLocalizations', () {
    final pulseArb = File('l10n/pulse.arb');
    expect(pulseArb.existsSync(), isTrue, reason: 'Add strings in l10n/pulse.arb, then run: dart run tool/l10n.dart');

    final generated = File('lib/l10n/app_localizations.dart').readAsStringSync();
    const required = [
      'String get navPulse',
      'String get pulseTodayTitle',
      'String get pulseWeekTitle',
      'String get pulseInboxTitle',
      'String pulseTodayCount',
      'String pulseBriefBusy',
    ];
    for (final signature in required) {
      expect(generated, contains(signature), reason: 'Run `dart run tool/l10n.dart` from apps/mobile');
    }
  });
}
