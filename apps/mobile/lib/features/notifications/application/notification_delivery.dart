import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_client.dart';
import '../../../core/realtime/realtime_client.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/app_notification.dart';
import '../infrastructure/local_notifier.dart';
import '../infrastructure/push_messaging.dart';
import 'notifications_controller.dart';

/// Wires every inbound notification path for a signed-in session:
/// realtime socket → feed (+ tray when backgrounded), FCM push, and taps from both.
class NotificationDelivery {
  NotificationDelivery(this._ref);

  final Ref _ref;
  final _subscriptions = <StreamSubscription<Object?>>[];
  final _foreground = StreamController<AppNotification>.broadcast();
  final _opened = StreamController<String?>.broadcast();
  bool _started = false;

  /// New notifications that arrived while the app is visible (for an in-app toast).
  Stream<AppNotification> get foreground => _foreground.stream;

  /// Notification ids the user tapped in the system tray; null opens the feed.
  Stream<String?> get opened => _opened.stream;

  Future<void> start({required AppLocalizations l10n, required String locale}) async {
    if (_started) return;
    _started = true;

    final realtime = _ref.read(realtimeClientProvider);
    final local = _ref.read(localNotifierProvider);
    final push = _ref.read(pushMessagingProvider);

    _subscriptions
      ..add(realtime.events.where((e) => e.name == RealtimeEvents.notificationCreated).listen(_onRealtime))
      ..add(realtime.rejected.listen((_) => _ref.read(notificationsProvider.notifier).reload().ignore()))
      ..add(local.taps.listen(_opened.add))
      ..add(push.taps.listen(_opened.add));
    realtime.connect();

    await local.initialize(
      channelName: l10n.notificationChannelName,
      channelDescription: l10n.notificationChannelDescription,
    );
    await push.prepare();
  }

  /// Registers push when the member already granted OS permission.
  Future<void> ensurePushRegistered({required String locale}) async {
    await _ref.read(pushMessagingProvider).registerIfAuthorized(locale: locale);
  }

  /// After the in-app primer — requests OS permission and registers the device token.
  Future<bool> enablePush({required String locale}) async {
    return _ref.read(pushMessagingProvider).requestPermissionAndRegister(locale: locale);
  }

  /// Ends delivery for this device before sign-out (push token is unregistered server-side).
  Future<void> stop() async {
    await _cancel();
    _ref.read(realtimeClientProvider).close();
    await _ref.read(pushMessagingProvider).unregister();
  }

  void _onRealtime(RealtimeEvent event) {
    final payload = event.payload;
    if (payload is! Map) return;
    final notification = AppNotification.fromJson(Json.from(payload));
    _ref.read(notificationsProvider.notifier).receive(notification);
    final visible = WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    if (visible) {
      _foreground.add(notification);
    } else {
      _ref.read(localNotifierProvider).show(id: notification.id, title: notification.title, body: notification.body);
    }
  }

  Future<void> _cancel() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
    _started = false;
  }

  void dispose() {
    _cancel();
    _foreground.close();
    _opened.close();
  }
}

final notificationDeliveryProvider = Provider<NotificationDelivery>((ref) {
  final delivery = NotificationDelivery(ref);
  ref.onDispose(delivery.dispose);
  return delivery;
});
