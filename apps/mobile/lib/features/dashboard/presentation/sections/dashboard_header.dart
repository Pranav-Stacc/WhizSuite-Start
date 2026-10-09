import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../app/navigation/app_routes.dart';
import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../access/presentation/permission_gate.dart';
import '../../../auth/application/session_controller.dart';
import '../../../auth/domain/session.dart';
import '../../../clients/clients_routes.dart';
import '../../../content/content_routes.dart';
import '../../../notifications/application/notifications_controller.dart';
import '../../../profile/data/profile_repository.dart';
import '../../../profile/domain/profile.dart';
import '../../../tasks/tasks_routes.dart';
import '../../../time/time_routes.dart';
import '../widgets/overview_layout.dart';

/// First name to greet the member by, falling back to their display name or email.
String greetingName(Profile? profile, Session? session) {
  final first = profile?.firstName?.trim();
  if (first != null && first.isNotEmpty) return first;
  final display = profile?.displayName.trim();
  if (display != null && display.isNotEmpty) return display.split(RegExp(r'\s+')).first;
  return session?.email ?? '';
}

/// Editorial greeting: date eyebrow, greeting, subtitle and the unread notifications pill.
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          DateFormat.MMMMEEEEd(locale).format(DateTime.now()).toUpperCase(),
          style: text.labelMedium?.copyWith(color: tokens.muted, letterSpacing: 0.8),
        ),
        SizedBox(height: tokens.xs),
        Semantics(
          header: true,
          child: Text(
            title ?? l10n.homeGreeting(greetingName(profile, session)),
            style: text.headlineMedium?.copyWith(fontWeight: FontWeight.w500, letterSpacing: -0.4),
          ),
        ),
        SizedBox(height: tokens.xs),
        Text(subtitle ?? l10n.homeSubtitle, style: text.bodyLarge?.copyWith(color: tokens.muted)),
        if (unread > 0) ...[
          SizedBox(height: tokens.sm),
          ActionChip(
            avatar: Icon(Icons.notifications_active_outlined, size: 18, color: tokens.primary),
            label: Text(l10n.notificationsUnread(unread)),
            tooltip: l10n.navNotifications,
            visualDensity: VisualDensity.compact,
            onPressed: () => context.go(AppRoutes.notifications),
          ),
        ],
      ],
    );
  }
}

typedef _QuickAction = ({String permission, IconData icon, String Function(AppLocalizations) label, String route});

final List<_QuickAction> _quickActions = [
  (permission: Permissions.tasksCreate, icon: Icons.add_task, label: (l10n) => l10n.dashboardQuickNewTask, route: TasksRoutes.root),
  (permission: Permissions.contentCreate, icon: Icons.edit_note, label: (l10n) => l10n.dashboardQuickNewPost, route: ContentRoutes.root),
  (permission: Permissions.clientsCreate, icon: Icons.person_add_alt_1_outlined, label: (l10n) => l10n.dashboardQuickNewClient, route: ClientsRoutes.root),
  (permission: Permissions.timeTrack, icon: Icons.timer_outlined, label: (l10n) => l10n.dashboardQuickLogTime, route: TimeRoutes.root),
];

/// Shortcuts to the most common create flows, each shown only when permitted.
class DashboardQuickActions extends ConsumerWidget {
  const DashboardQuickActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final permitted = ref.watch(accessPolicyProvider.select((p) => p.canAny([for (final a in _quickActions) a.permission])));
    if (!permitted) return const SizedBox.shrink();
    return Semantics(
      container: true,
      label: l10n.dashboardQuickActions,
      child: Wrap(
        spacing: tokens.sm,
        runSpacing: tokens.sm,
        children: [
          for (final action in _quickActions)
            PermissionGate(
              anyOf: [action.permission],
              child: OutlinedButton.icon(
                onPressed: () => context.go(action.route),
                icon: Icon(action.icon, size: 18),
                label: Text(action.label(l10n)),
              ),
            ),
        ],
      ),
    );
  }
}

/// Greeting with quick actions beside it on wide screens and below it on phones.
class DashboardHeader extends StatelessWidget {
  const DashboardHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < overviewWideBreakpoint) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [const DashboardGreeting(), SizedBox(height: tokens.lg), const DashboardQuickActions()],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Expanded(child: DashboardGreeting()),
            SizedBox(width: tokens.xl),
            const Flexible(child: Align(alignment: AlignmentDirectional.centerEnd, child: DashboardQuickActions())),
          ],
        );
      },
    );
  }
}
