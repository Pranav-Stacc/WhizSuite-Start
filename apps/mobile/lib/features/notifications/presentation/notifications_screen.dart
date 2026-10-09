import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../application/notifications_controller.dart';
import '../domain/app_notification.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadNotificationCountProvider);
    final controller = ref.read(notificationsProvider.notifier);

    Future<void> run(Future<void> Function() action) async {
      try {
        await action();
      } on ApiException catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(describeError(l10n, error))));
        }
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notificationsTitle),
        actions: [
          if (unread > 0)
            TextButton(onPressed: () => run(controller.markAllRead), child: Text(l10n.notificationsMarkAll)),
        ],
      ),
      body: AsyncValueView(
        value: feed,
        onRetry: () => ref.invalidate(notificationsProvider),
        isEmpty: (items) => items.isEmpty,
        empty: EmptyState(
          icon: Icons.notifications_none,
          title: l10n.notificationsEmpty,
          body: l10n.notificationsEmptyBody,
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () => run(controller.reload),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, _) => const Divider(),
            itemBuilder: (context, index) => FadeSlideIn(
              index: index,
              child: _NotificationTile(
                notification: items[index],
                onTap: items[index].isRead ? null : () => run(() => controller.markRead(items[index].id)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, this.onTap});

  static const _dotSize = 8.0;

  final AppNotification notification;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final when = DateFormat.yMMMd(locale).add_jm().format(notification.createdAt.toLocal());
    final unread = !notification.isRead;
    return Semantics(
      button: onTap != null,
      hint: onTap != null ? l10n.notificationsMarkRead : null,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: EdgeInsets.only(top: tokens.sm, right: tokens.md),
                child: AnimatedOpacity(
                  duration: AppMotion.medium,
                  opacity: unread ? 1 : 0,
                  child: Container(
                    width: _dotSize,
                    height: _dotSize,
                    decoration: BoxDecoration(color: tokens.primary, shape: BoxShape.circle),
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(notificationTypeLabel(l10n, notification.typeKey).toUpperCase(), style: text.labelSmall),
                    SizedBox(height: tokens.xs),
                    Text(
                      notification.title,
                      style: text.titleSmall?.copyWith(fontWeight: unread ? FontWeight.w600 : FontWeight.w400),
                    ),
                    if (notification.body.isNotEmpty) ...[
                      SizedBox(height: tokens.xs),
                      Text(notification.body, style: text.bodyMedium?.copyWith(color: tokens.secondary)),
                    ],
                    SizedBox(height: tokens.sm),
                    Text(when, style: text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
