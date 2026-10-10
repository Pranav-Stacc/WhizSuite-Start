import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/storage/preferences.dart';

/// Persists notification onboarding state on device (not server preferences).
class NotificationPermissionStore {
  NotificationPermissionStore(this._prefs);

  static const _primerCompletedKey = 'notifications.primer_completed_v1';

  final SharedPreferences _prefs;

  bool primerCompleted() => _prefs.getBool(_primerCompletedKey) ?? false;

  Future<void> markPrimerCompleted() => _prefs.setBool(_primerCompletedKey, true);

  Future<void> resetPrimer() => _prefs.remove(_primerCompletedKey);
}

final notificationPermissionStoreProvider = Provider<NotificationPermissionStore>(
  (ref) => NotificationPermissionStore(ref.watch(sharedPreferencesProvider)),
);
