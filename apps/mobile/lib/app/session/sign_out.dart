import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/application/notification_delivery.dart';

/// Ends the session on this device: stops realtime, unregisters the push device, revokes tokens.
final signOutProvider = Provider<Future<void> Function()>((ref) {
  return () async {
    try {
      await ref.read(notificationDeliveryProvider).stop();
    } on ApiException {
      // Device cleanup is best effort; the server prunes stale push tokens on delivery.
    }
    await ref.read(sessionProvider.notifier).signOut();
  };
});
