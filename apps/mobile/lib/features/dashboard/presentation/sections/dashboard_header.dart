import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../app/navigation/app_routes.dart';
import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../auth/application/session_controller.dart';
import '../../../auth/domain/session.dart';
import '../../../clients/clients_routes.dart';
import '../../../content/content_routes.dart';
import '../../../notifications/application/notifications_controller.dart';
import '../../../profile/data/profile_repository.dart';
import '../../../profile/domain/profile.dart';
import '../../../tasks/tasks_routes.dart';
import '../../../time/time_routes.dart';
import '../../application/dashboard_providers.dart';

/// First name to greet the member by, falling back to their display name or email.
String greetingName(Profile? profile, Session? session) {
  final first = profile?.firstName?.trim();
  if (first != null && first.isNotEmpty) return first;
  final display = profile?.displayName.trim();
  if (display != null && display.isNotEmpty) return display.split(RegExp(r'\s+')).first;
  return session?.email ?? '';
}

/// Date, greeting, focus line and unread notifications.
class DashboardGreeting extends ConsumerWidget {
  const DashboardGreeting({this.title, this.subtitle, super.key});

  /// Overrides the greeting line (the portal greets with the client's name).
  final String? title;
  final String? subtitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final session = ref.watch(sessionProvider).value;
    final profile = ref.watch(profileProvider).value;
    final unread = ref.watch(unreadNotificationCountProvider);
    // Portal passes its own subtitle; only staff home derives the focus line.
    final focus = subtitle == null ? ref.watch(dashboardFocusProvider) : null;
    final resolvedSubtitle = subtitle ??
        (focus != null && focus.canSeeWork
            ? (focus.ready
                ? (focus.attentionCount > 0
                    ? l10n.dashboardFocusSubtitle(focus.attentionCount)
                    : l10n.dashboardFocusClearSubtitle)
                : l10n.homeSubtitle)
            : l10n.homeSubtitle);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          DateFormat.MMMMEEEEd(locale).format(DateTime.now()).toUpperCase(),
          style: text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 1.0, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: tokens.sm),
        Semantics(
          header: true,
          child: Text(
            title ?? l10n.homeGreeting(greetingName(profile, session)),
            style: text.headlineMedium?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: -0.6,
              height: 1.15,
            ),
          ),
        ),
        SizedBox(height: tokens.xs + 2),
        Text(
          resolvedSubtitle,
          style: text.bodyLarge?.copyWith(color: tokens.secondary, height: 1.4),
        ),
        if (unread > 0) ...[
          SizedBox(height: tokens.md),
          ActionChip(
            avatar: Icon(Icons.notifications_active_outlined, size: 16, color: tokens.primary),
            label: Text(l10n.notificationsUnread(unread)),
            tooltip: l10n.navNotifications,
            visualDensity: VisualDensity.compact,
            onPressed: () => context.push(AppRoutes.notifications),
          ),
        ],
      ],
    );
  }
}

typedef DashboardQuickAction = ({String permission, IconData icon, String Function(AppLocalizations) label, String route});

final List<DashboardQuickAction> dashboardQuickActions = [
  (permission: Permissions.tasksCreate, icon: Icons.add_task, label: (l10n) => l10n.dashboardQuickNewTask, route: TasksRoutes.root),
  (permission: Permissions.contentCreate, icon: Icons.edit_note, label: (l10n) => l10n.dashboardQuickNewPost, route: ContentRoutes.root),
  (permission: Permissions.clientsCreate, icon: Icons.person_add_alt_1_outlined, label: (l10n) => l10n.dashboardQuickNewClient, route: ClientsRoutes.root),
  (permission: Permissions.timeTrack, icon: Icons.timer_outlined, label: (l10n) => l10n.dashboardQuickLogTime, route: TimeRoutes.root),
];

