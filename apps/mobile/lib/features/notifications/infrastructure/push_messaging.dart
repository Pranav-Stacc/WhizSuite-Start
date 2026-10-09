import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/app_config.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/storage/preferences.dart';
import '../data/notifications_repository.dart';
import 'local_notifier.dart';

const _notificationIdKey = 'notificationId';

/// FCM registration, gated by `PUSH_ENABLED`. Requires the platform Firebase config
/// (`google-services.json` / `GoogleService-Info.plist`); without it push stays off.
class PushMessaging {
  PushMessaging(this._config, this._repository, this._prefs, this._local);

  static const _deviceIdKey = 'push.device_id';

  final AppConfig _config;
  final NotificationsRepository _repository;
  final SharedPreferences _prefs;
  final LocalNotifier _local;
  final _taps = StreamController<String?>.broadcast();
  final _subscriptions = <StreamSubscription<Object?>>[];

  /// Notification ids from tapped push messages (background or terminated launch).
  Stream<String?> get taps => _taps.stream;

  bool get _supported => _config.pushEnabled && !kIsWeb && _platform != null;

  String? get _platform => switch (defaultTargetPlatform) {
        TargetPlatform.android => DevicePlatforms.android,
        TargetPlatform.iOS => DevicePlatforms.ios,
        _ => null,
      };

  Future<void> register({required String locale}) async {
    final platform = _platform;
    if (!_supported || platform == null || _subscriptions.isNotEmpty) return;
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
    } on FirebaseException catch (error) {
      debugPrint('Push disabled: Firebase is not configured (${error.code}).');
      return;
    }

    final messaging = FirebaseMessaging.instance;
    final permission = await messaging.requestPermission();
    if (permission.authorizationStatus == AuthorizationStatus.denied) return;
    await _local.requestPermission();

    final token = await messaging.getToken();
    if (token != null) await _registerToken(token, platform, locale);

    _subscriptions
      ..add(messaging.onTokenRefresh.listen((next) => _registerToken(next, platform, locale)))
      ..add(FirebaseMessaging.onMessage.listen(_showForeground))
      ..add(FirebaseMessaging.onMessageOpenedApp.listen((m) => _taps.add(m.data[_notificationIdKey] as String?)));

    final initial = await messaging.getInitialMessage();
    if (initial != null) _taps.add(initial.data[_notificationIdKey] as String?);
  }

  /// Removes this device from the member's push targets (call before signing out).
  Future<void> unregister() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
    final deviceId = _prefs.getString(_deviceIdKey);
    if (deviceId == null) return;
    await _prefs.remove(_deviceIdKey);
    await _repository.removeDevice(deviceId);
    if (Firebase.apps.isNotEmpty) await FirebaseMessaging.instance.deleteToken();
  }

  Future<void> _registerToken(String token, String platform, String locale) async {
    final deviceId = await _repository.registerDevice(token: token, platform: platform, locale: locale);
    await _prefs.setString(_deviceIdKey, deviceId);
  }

  void _showForeground(RemoteMessage message) {
    final notification = message.notification;
    final id = message.data[_notificationIdKey] as String? ?? message.messageId;
    if (notification == null || id == null) return;
    _local.show(id: id, title: notification.title ?? '', body: notification.body ?? '');
  }

  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _taps.close();
  }
}

final pushMessagingProvider = Provider<PushMessaging>((ref) {
  final push = PushMessaging(
    ref.watch(appConfigProvider),
    ref.watch(notificationsRepositoryProvider),
    ref.watch(sharedPreferencesProvider),
    ref.watch(localNotifierProvider),
  );
  ref.onDispose(push.dispose);
  return push;
});
