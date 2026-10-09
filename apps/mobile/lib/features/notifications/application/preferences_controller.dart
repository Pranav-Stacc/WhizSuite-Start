import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/notifications_repository.dart';
import '../domain/app_notification.dart';

class NotificationPreferencesController extends AsyncNotifier<List<NotificationPreference>> {
  @override
  Future<List<NotificationPreference>> build() => ref.watch(notificationsRepositoryProvider).preferences();

  /// Optimistic toggle; reverts and rethrows if the server rejects it.
  Future<void> setChannel(String typeKey, String channel, bool enabled) async {
    final previous = state.value;
    if (previous == null) return;
    state = AsyncData([for (final p in previous) p.typeKey == typeKey ? p.withChannel(channel, enabled) : p]);
    try {
      final saved = await ref.read(notificationsRepositoryProvider).setChannels(typeKey, {channel: enabled});
      final current = state.value ?? previous;
      if (ref.mounted) state = AsyncData([for (final p in current) p.typeKey == typeKey ? saved : p]);
    } catch (_) {
      if (ref.mounted) state = AsyncData(previous);
      rethrow;
    }
  }
}

final notificationPreferencesProvider =
    AsyncNotifierProvider<NotificationPreferencesController, List<NotificationPreference>>(
  NotificationPreferencesController.new,
);
