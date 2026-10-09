import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/session_controller.dart';
import '../data/notifications_repository.dart';
import '../domain/app_notification.dart';

/// The member's notification feed. Realtime events are merged in via [receive].
class NotificationsController extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    final session = await ref.watch(sessionProvider.future);
    if (session == null) return const [];
    return ref.watch(notificationsRepositoryProvider).list();
  }

  /// Pull-to-refresh: keeps the current list on failure and rethrows so the caller can report it.
  Future<void> reload() async {
    final next = await AsyncValue.guard(() => ref.read(notificationsRepositoryProvider).list());
    if (!ref.mounted) return;
    if (next.hasError && state.hasValue) Error.throwWithStackTrace(next.error!, next.stackTrace!);
    state = next;
  }

  /// Adds a notification pushed over the realtime socket, ignoring duplicates.
  void receive(AppNotification notification) {
    final current = state.value;
    if (current == null || current.any((n) => n.id == notification.id)) return;
    state = AsyncData([notification, ...current]);
  }

  /// Optimistic; restores the previous list if the server rejects the change.
  Future<void> markRead(String id) => _optimistic(
        (items) => [for (final n in items) n.id == id ? n.markedRead(DateTime.now().toUtc()) : n],
        () => ref.read(notificationsRepositoryProvider).markRead(id),
      );

  Future<void> markAllRead() => _optimistic(
        (items) => [for (final n in items) n.markedRead(DateTime.now().toUtc())],
        () => ref.read(notificationsRepositoryProvider).markAllRead(),
      );

  Future<void> _optimistic(
    List<AppNotification> Function(List<AppNotification>) apply,
    Future<void> Function() commit,
  ) async {
    final previous = state.value;
    if (previous == null) return;
    state = AsyncData(apply(previous));
    try {
      await commit();
    } catch (_) {
      if (ref.mounted) state = AsyncData(previous);
      rethrow;
    }
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<AppNotification>>(NotificationsController.new);

final unreadNotificationCountProvider = Provider<int>(
  (ref) => ref.watch(notificationsProvider).value?.where((n) => !n.isRead).length ?? 0,
);
