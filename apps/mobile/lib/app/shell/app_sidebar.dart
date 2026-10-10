import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../core/widgets/app_logo.dart';
import '../../features/auth/domain/session.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';
import 'nav_menu_grid.dart';

/// Mega-menu drawer / rail: sectioned 2-column tiles matching the web mobile menu.
class AppSidebar extends StatelessWidget {
  const AppSidebar({
    required this.session,
    required this.groups,
    required this.location,
    required this.onNavigate,
    this.permanent = false,
    super.key,
  });

  static const _railWidth = 288.0;

  final Session session;
  final Map<NavGroup, List<AppDestination>> groups;
  final String location;
  final ValueChanged<String> onNavigate;
  final bool permanent;

  bool _active(String path) => location == path || location.startsWith('$path/');

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final bg = tokens.bg;

    final body = ColoredBox(
      color: bg,
      child: ListView(
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.md, tokens.xxl),
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.xs, tokens.md, tokens.xs, tokens.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const AppLogo.primary(height: 34),
                SizedBox(height: tokens.lg),
                Text(
                  l10n.navMenu.toUpperCase(),
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: tokens.fg,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                SizedBox(height: tokens.xs),
                Text(
                  session.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(color: tokens.muted),
                ),
              ],
            ),
          ),
          // Overview lives on the bottom dock; only the permanent rail needs it here.
          if (permanent)
            NavMenuSection(
              label: l10n.navHome,
              items: [
                NavMenuItem(
                  icon: Icons.space_dashboard_outlined,
                  selectedIcon: Icons.space_dashboard,
                  label: l10n.navHome,
                  selected: _active(AppRoutes.home),
                  onTap: () => onNavigate(AppRoutes.home),
                ),
              ],
            ),
          if (groups.isEmpty)
            Padding(
              padding: EdgeInsets.all(tokens.md),
              child: Text(l10n.navMoreEmpty, style: theme.textTheme.bodySmall?.copyWith(color: tokens.muted)),
            )
          else
            ...navMenuSections(
              l10n: l10n,
              groups: groups,
              location: location,
              onNavigate: onNavigate,
            ),
          NavMenuSection(
            label: l10n.navNotifications,
            items: [
              NavMenuItem(
                icon: Icons.notifications_outlined,
                selectedIcon: Icons.notifications,
                label: l10n.navNotifications,
                selected: _active(AppRoutes.notifications),
                onTap: () => onNavigate(AppRoutes.notifications),
              ),
            ],
          ),
        ],
      ),
    );

    if (permanent) {
      return Material(
        color: bg,
        child: SizedBox(
          width: _railWidth,
          child: SafeArea(
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(right: BorderSide(color: tokens.border.withValues(alpha: 0.8))),
              ),
              child: body,
            ),
          ),
        ),
      );
    }

    final screenW = MediaQuery.sizeOf(context).width;
    return Drawer(
      width: (screenW * 0.82).clamp(260.0, 320.0),
      backgroundColor: bg,
      surfaceTintColor: Colors.transparent,
      child: SafeArea(child: body),
    );
  }
}
