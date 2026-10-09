import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';

/// System tray notifications for realtime and foreground push messages.
/// Taps are exposed as a stream of payloads (notification ids) for the app to route.
class LocalNotifier {
  LocalNotifier(this._channelId);

  static const _androidIcon = '@mipmap/ic_launcher';

  final String _channelId;
  final _plugin = FlutterLocalNotificationsPlugin();
  final _taps = StreamController<String?>.broadcast();
  String? _channelName;

  bool get isSupported => !kIsWeb;

  Stream<String?> get taps => _taps.stream;

  Future<void> initialize({required String channelName, required String channelDescription}) async {
    if (!isSupported || _channelName != null) return;
    _channelName = channelName;
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings(_androidIcon),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (response) => _taps.add(response.payload),
    );
    await _android?.createNotificationChannel(
      AndroidNotificationChannel(_channelId, channelName, description: channelDescription, importance: Importance.high),
    );
    final launch = await _plugin.getNotificationAppLaunchDetails();
    if (launch?.didNotificationLaunchApp ?? false) _taps.add(launch!.notificationResponse?.payload);
  }

  /// Asks the OS for permission; returns whether notifications may be shown.
  Future<bool> requestPermission() async {
    if (!isSupported) return false;
    final ios = _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    final granted = await _android?.requestNotificationsPermission() ??
        await ios?.requestPermissions(alert: true, badge: true, sound: true);
    return granted ?? false;
  }

  Future<void> show({required String id, required String title, required String body}) async {
    final channelName = _channelName;
    if (!isSupported || channelName == null) return;
    await _plugin.show(
      id: id.hashCode,
      title: title,
      body: body,
      payload: id,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(_channelId, channelName, importance: Importance.high, priority: Priority.high),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }

  AndroidFlutterLocalNotificationsPlugin? get _android =>
      _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

  void dispose() => _taps.close();
}

final localNotifierProvider = Provider<LocalNotifier>((ref) {
  final notifier = LocalNotifier(ref.watch(appConfigProvider).androidNotificationChannelId);
  ref.onDispose(notifier.dispose);
  return notifier;
});
