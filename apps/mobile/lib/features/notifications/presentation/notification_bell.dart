import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
import '../../../l10n/app_localizations.dart';
import '../application/notifications_controller.dart';

/// App bar action with the live unread count.
class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationCountProvider);
    final l10n = AppLocalizations.of(context);
    final label = unread > 0 ? '${l10n.navNotifications}, ${l10n.notificationsUnread(unread)}' : l10n.navNotifications;
    return IconButton(
      tooltip: label,
      onPressed: () => context.push(AppRoutes.notifications),
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text('$unread'),
        child: Icon(unread > 0 ? Icons.notifications : Icons.notifications_outlined),
      ),
    );
  }
}
