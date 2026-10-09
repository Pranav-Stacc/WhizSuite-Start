import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../application/notifications_controller.dart';
import '../domain/app_notification.dart';
import 'notification_links.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  /// Marks the notification read and opens its subject when it has one.
  void _open(BuildContext context, AppNotification notification, NotificationsController controller) {
    if (!notification.isRead) runAction(context, () => controller.markRead(notification.id));
    final link = notificationLink(notification);
    if (link != AppRoutes.notifications) context.push(link);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final feed = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadNotificationCountProvider);
    final controller = ref.read(notificationsProvider.notifier);

    Future<void> run(Future<void> Function() action) => runAction(context, action);

    return PageScaffold(
      title: l10n.notificationsTitle,
      showShellActions: false,
      actions: [
        if (unread > 0)
          TextButton(onPressed: () => run(controller.markAllRead), child: Text(l10n.notificationsMarkAll)),
      ],
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
            padding: EdgeInsets.only(bottom: tokens.xxl),
            itemCount: items.length,
            separatorBuilder: (_, _) => Divider(height: 1, color: tokens.border.withValues(alpha: 0.6)),
            itemBuilder: (context, index) => FadeSlideIn(
              index: index,
              child: _NotificationTile(
                notification: items[index],
                onTap: () => _open(context, items[index], controller),
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

  static const _iconSize = 36.0;
  static const _unreadAlpha = 0.06;

  final AppNotification notification;
  final VoidCallback? onTap;

  IconData get _icon => switch (notification.typeKey) {
        NotificationTypeKeys.taskAssigned => Icons.assignment_outlined,
        NotificationTypeKeys.contentApproved => Icons.check_circle_outline,
        NotificationTypeKeys.contentChangesRequested => Icons.rate_review_outlined,
        _ => Icons.notifications_outlined,
      };

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final when = context.formats.relative(notification.createdAt);
    final unread = !notification.isRead;
    return Semantics(
      button: onTap != null,
      hint: unread ? l10n.notificationsMarkRead : null,
      child: Material(
        color: unread ? tokens.primary.withValues(alpha: _unreadAlpha) : Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.sm + tokens.xs),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: _iconSize,
                  height: _iconSize,
                  decoration: BoxDecoration(
                    color: tokens.subtle,
                    borderRadius: BorderRadius.circular(tokens.radius + 6),
                    border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                  ),
                  child: Icon(_icon, size: 18, color: unread ? tokens.primary : tokens.secondary),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notificationTypeLabel(l10n, notification.typeKey).toUpperCase(),
                              style: text.labelSmall?.copyWith(
                                color: unread ? tokens.primary : tokens.muted,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                          Text(when, style: text.labelSmall?.copyWith(color: tokens.muted)),
                        ],
                      ),
                      SizedBox(height: tokens.xs),
                      Text(
                        notification.title,
                        style: text.titleSmall?.copyWith(fontWeight: unread ? FontWeight.w600 : FontWeight.w500),
                      ),
                      if (notification.body.isNotEmpty) ...[
                        SizedBox(height: tokens.xs),
                        Text(
                          notification.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodySmall?.copyWith(color: tokens.secondary, height: 1.35),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
