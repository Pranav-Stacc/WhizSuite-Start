import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../features/access/domain/access_policy.dart';
import '../../features/auth/domain/session.dart';
import '../../l10n/app_localizations.dart';
import 'app_routes.dart';

/// Who a destination is built for. Client memberships get the portal experience;
/// within each audience, visibility is decided purely by permissions.
enum Audience { staff, portal }

enum NavGroup {
  work,
  content,
  clients,
  automate,
  money,
  agency;

  String label(AppLocalizations l10n) => switch (this) {
        NavGroup.work => l10n.navGroupWork,
        NavGroup.content => l10n.navGroupContent,
        NavGroup.clients => l10n.navGroupClients,
        NavGroup.automate => l10n.navGroupAutomate,
        NavGroup.money => l10n.navGroupMoney,
        NavGroup.agency => l10n.navGroupAgency,
      };
}

/// A navigable area of the app and the permissions that unlock it.
/// Requirements match the API's `@RequirePermissions` on the endpoints the screen loads,
/// so custom roles composed in Roles & permissions shape the app automatically.
class AppDestination {
  const AppDestination({
    required this.path,
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.anyOf,
    required this.audiences,
    this.group,
    this.primary = false,
  });

  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String Function(AppLocalizations l10n) label;

  /// The member needs at least one of these; empty means every signed-in member.
  final List<String> anyOf;
  final Set<Audience> audiences;

  /// Section under "More"; null for destinations only reachable from the bottom bar.
  final NavGroup? group;

  /// Pinned to the bottom navigation bar when permitted.
  final bool primary;

  bool isVisibleTo(Audience audience, AccessPolicy policy) => audiences.contains(audience) && policy.canAny(anyOf);
}

const _everyone = {Audience.staff, Audience.portal};

final List<AppDestination> appDestinations = [
  AppDestination(
    path: AppRoutes.home,
    icon: Icons.space_dashboard_outlined,
    selectedIcon: Icons.space_dashboard,
    label: (l10n) => l10n.navHome,
    anyOf: const [Permissions.orgView],
    audiences: _everyone,
    primary: true,
  ),
  AppDestination(
    path: AppRoutes.settings,
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings,
    label: (l10n) => l10n.navSettings,
    anyOf: const [],
    audiences: _everyone,
    group: NavGroup.agency,
  ),
];

Audience audienceOf(Session session) => session.isClientPortal ? Audience.portal : Audience.staff;

/// Maximum destinations pinned to the bottom bar before "More".
const int maxPrimaryDestinations = 4;

class NavigationModel {
  NavigationModel(Session session, AccessPolicy policy)
      : visible = appDestinations.where((d) => d.isVisibleTo(audienceOf(session), policy)).toList();

  final List<AppDestination> visible;

  List<AppDestination> get primary => visible.where((d) => d.primary).take(maxPrimaryDestinations).toList();

  Map<NavGroup, List<AppDestination>> get secondaryGroups {
    final pinned = primary.toSet();
    final groups = <NavGroup, List<AppDestination>>{};
    for (final destination in visible) {
      final group = destination.group;
      if (group == null || pinned.contains(destination)) continue;
      (groups[group] ??= []).add(destination);
    }
    return groups;
  }
}

/// The destination owning [location], matched by longest path prefix.
AppDestination? destinationFor(String location) {
  AppDestination? best;
  for (final destination in appDestinations) {
    final path = destination.path;
    final matches = location == path || location.startsWith('$path/');
    if (matches && (best == null || path.length > best.path.length)) best = destination;
  }
  return best;
}
