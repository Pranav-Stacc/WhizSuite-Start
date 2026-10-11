import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/widgets/fade_slide_in.dart';
import '../../core/widgets/page_scaffold.dart';
import '../../core/widgets/state_views.dart';
import '../../features/access/application/access_controller.dart';
import '../../features/auth/application/session_controller.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';
import '../session/sign_out.dart';
import 'nav_menu_grid.dart';

/// Every permitted destination not pinned to the bottom bar — same mega-menu grid as the sidebar.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final session = ref.watch(sessionProvider).value;
    if (session == null) return const SizedBox.shrink();
    final navigation = NavigationModel(session, ref.watch(accessPolicyProvider));
    final groups = navigation.secondaryGroups;
    final location = GoRouterState.of(context).uri.path;

    return PageScaffold(
      title: l10n.navMore,
      body: groups.isEmpty
          ? Center(
              child: Padding(
                padding: EdgeInsets.all(tokens.lg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    EmptyState(icon: Icons.apps_outlined, title: l10n.navMoreEmpty),
                    SizedBox(height: tokens.xl),
                    OutlinedButton.icon(
                      onPressed: () => confirmSignOut(context, ref),
                      icon: const Icon(Icons.logout, size: 18),
                      label: Text(l10n.settingsSignOut),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(44),
                        foregroundColor: tokens.fg,
                        side: BorderSide(color: tokens.border),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(tokens.radius),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: () => ref.read(accessProvider.notifier).refresh(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.xxl * 2),
                children: [
                  for (final (index, section) in navMenuSections(
                    l10n: l10n,
                    groups: groups,
                    location: location,
                    onNavigate: (path) => context.go(path),
                  ).indexed)
                    FadeSlideIn(index: index, child: section),
                  FadeSlideIn(
                    index: groups.length,
                    child: NavMenuSection(
                      label: l10n.navNotifications,
                      items: [
                        NavMenuItem(
                          icon: Icons.notifications_outlined,
                          selectedIcon: Icons.notifications,
                          label: l10n.navNotifications,
                          selected: location == AppRoutes.notifications ||
                              location.startsWith('${AppRoutes.notifications}/'),
                          onTap: () => context.go(AppRoutes.notifications),
                        ),
                      ],
                    ),
                  ),
                  FadeSlideIn(
                    index: groups.length + 1,
                    child: Padding(
                      padding: EdgeInsets.only(top: tokens.md, bottom: tokens.xl),
                      child: OutlinedButton.icon(
                        onPressed: () => confirmSignOut(context, ref),
                        icon: const Icon(Icons.logout, size: 18),
                        label: Text(l10n.settingsSignOut),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(44),
                          foregroundColor: tokens.fg,
                          side: BorderSide(color: tokens.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(tokens.radius),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
