import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../features/auth/domain/session.dart';
import '../../l10n/app_localizations.dart';
import '../navigation/app_routes.dart';
import '../navigation/destinations.dart';

/// Grouped destinations for the shell sidebar / drawer (mirrors web sidebar sections).
class AppSidebar extends StatelessWidget {
  const AppSidebar({
    required this.session,
    required this.groups,
    required this.location,
    required this.onNavigate,
    this.permanent = false,
    super.key,
  });

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

    final body = ListView(
      padding: EdgeInsets.fromLTRB(tokens.md, tokens.lg, tokens.md, tokens.xxl),
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.navMenu,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: tokens.xs),
              Text(
                session.email,
                style: theme.textTheme.bodySmall?.copyWith(color: tokens.muted),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        SizedBox(height: tokens.lg),
        _SideItem(
          icon: Icons.space_dashboard_outlined,
          selectedIcon: Icons.space_dashboard,
          label: l10n.navHome,
          selected: _active(AppRoutes.home),
          onTap: () => onNavigate(AppRoutes.home),
        ),
        SizedBox(height: tokens.md),
        if (groups.isEmpty)
          Padding(
            padding: EdgeInsets.all(tokens.md),
            child: Text(l10n.navMoreEmpty, style: theme.textTheme.bodySmall?.copyWith(color: tokens.muted)),
          )
        else
          for (final entry in groups.entries) ...[
            Padding(
              padding: EdgeInsets.fromLTRB(tokens.sm, tokens.sm, tokens.sm, tokens.xs),
              child: Text(
                entry.key.label(l10n).toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: tokens.muted,
                  letterSpacing: 0.9,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            for (final destination in entry.value)
              _SideItem(
                icon: destination.icon,
                selectedIcon: destination.selectedIcon,
                label: destination.label(l10n),
                selected: _active(destination.path),
                onTap: () => onNavigate(destination.path),
              ),
            SizedBox(height: tokens.sm),
          ],
        const Divider(height: 24),
        _SideItem(
          icon: Icons.notifications_outlined,
          selectedIcon: Icons.notifications,
          label: l10n.navNotifications,
          selected: _active(AppRoutes.notifications),
          onTap: () => onNavigate(AppRoutes.notifications),
        ),
      ],
    );

    if (permanent) {
      return Material(
        color: Color.lerp(tokens.surface, tokens.bg, 0.35),
        child: SizedBox(width: 268, child: SafeArea(child: body)),
      );
    }

    return Drawer(
      backgroundColor: Color.lerp(tokens.surface, tokens.bg, 0.2),
      child: SafeArea(child: body),
    );
  }
}

class _SideItem extends StatelessWidget {
  const _SideItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = selected ? tokens.primary : tokens.fg;

    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.xs / 2),
      child: Material(
        color: selected ? tokens.primary.withValues(alpha: 0.12) : Colors.transparent,
        borderRadius: BorderRadius.circular(tokens.radius + 8),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(tokens.radius + 8),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.sm + 2),
            child: Row(
              children: [
                Icon(selected ? selectedIcon : icon, size: 20, color: color),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: color,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                        ),
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
