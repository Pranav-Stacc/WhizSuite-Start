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
  var _prepared = false;

  /// Notification ids from tapped push messages (background or terminated launch).
  Stream<String?> get taps => _taps.stream;

  bool get isSupported => _config.pushEnabled && !kIsWeb && _platform != null;

  String? get _platform => switch (defaultTargetPlatform) {
        TargetPlatform.android => DevicePlatforms.android,
        TargetPlatform.iOS => DevicePlatforms.ios,
        _ => null,
      };

  /// Initializes Firebase without requesting OS permission.
  Future<void> prepare() async {
    if (!isSupported || _prepared) return;
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      _prepared = true;
    } on FirebaseException catch (error) {
      debugPrint('Push disabled: Firebase is not configured (${error.code}).');
    }
  }

  Future<bool> isAuthorized() async {
    if (!isSupported || !_prepared) return false;
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Registers push when permission was granted earlier (e.g. returning user).
  Future<void> registerIfAuthorized({required String locale}) async {
    await prepare();
    if (!isSupported || !await isAuthorized()) return;
    await _local.requestPermission();
    await _attachListenersAndToken(locale);
  }

  /// Shows the OS permission sheet, then registers this device for push.
  Future<bool> requestPermissionAndRegister({required String locale}) async {
    await prepare();
    final platform = _platform;
    if (!isSupported || platform == null) return false;

    final messaging = FirebaseMessaging.instance;
    final permission = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (permission.authorizationStatus == AuthorizationStatus.denied) return false;

    final localGranted = await _local.requestPermission();
    if (!localGranted && defaultTargetPlatform == TargetPlatform.android) {
      return false;
    }

    await _attachListenersAndToken(locale, platform: platform);
    return true;
  }

  Future<void> _attachListenersAndToken(String locale, {String? platform}) async {
    final resolvedPlatform = platform ?? _platform;
    if (resolvedPlatform == null) return;

    if (_subscriptions.isNotEmpty) {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _registerToken(token, resolvedPlatform, locale);
      return;
    }

    final messaging = FirebaseMessaging.instance;
    final token = await messaging.getToken();
    if (token != null) await _registerToken(token, resolvedPlatform, locale);

    _subscriptions
      ..add(messaging.onTokenRefresh.listen((next) => _registerToken(next, resolvedPlatform, locale)))
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
