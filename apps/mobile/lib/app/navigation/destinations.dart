import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import '../../features/access/domain/access_policy.dart';
import '../../features/auth/domain/session.dart';
import '../../features/custom_fields/custom_fields_routes.dart';
import '../../features/departments/departments_routes.dart';
import '../../features/roles/roles_routes.dart';
import '../../features/templates/templates_routes.dart';
import '../feature_registry.dart';
import 'app_routes.dart';

export '../../core/navigation/feature_module.dart' show AppDestination, Audience, NavGroup;

final _home = AppDestination(
  path: AppRoutes.home,
  icon: Icons.space_dashboard_outlined,
  selectedIcon: Icons.space_dashboard,
  label: (l10n) => l10n.navHome,
  anyOf: const [Permissions.orgView],
  audiences: everyAudience,
  primary: true,
);

final _more = AppDestination(
  path: AppRoutes.more,
  icon: Icons.bolt_outlined,
  selectedIcon: Icons.bolt_rounded,
  label: (l10n) => l10n.navPulse,
  anyOf: const [],
  audiences: everyAudience,
  primary: true,
);

final _settings = AppDestination(
  path: AppRoutes.settings,
  icon: Icons.settings_outlined,
  selectedIcon: Icons.settings,
  label: (l10n) => l10n.navSettings,
  anyOf: const [],
  audiences: everyAudience,
  group: NavGroup.agency,
);

/// Shell destinations plus every feature's, in navigation order.
final List<AppDestination> appDestinations = [
  _home,
  for (final module in featureModules) ...module.destinations,
  _more,
  _settings,
];

Audience audienceOf(Session session) => session.isClientPortal ? Audience.portal : Audience.staff;

/// Feature tabs pinned before the trailing "More" item.
const int maxPrimaryDestinations = 4;

/// Opened from the Agency (Team) hub — not listed again in sidebar / More grids.
const Set<String> agencyHubPaths = {
  DepartmentsRoutes.root,
  RolesRoutes.root,
};

/// Reachable from feature screens (projects, tasks, …) — not top-level nav.
const Set<String> featurePageOnlyPaths = {
  TemplatesRoutes.root,
  CustomFieldsRoutes.root,
};

class NavigationModel {
  NavigationModel(Session session, AccessPolicy policy)
      : visible = appDestinations.where((d) => d.isVisibleTo(audienceOf(session), policy)).toList();

  final List<AppDestination> visible;

  /// Bottom bar: up to [maxPrimaryDestinations] feature tabs, then More when present.
  List<AppDestination> get primary {
    final home = visible.where((d) => d.path == AppRoutes.home).firstOrNull;
    final more = visible.where((d) => d.path == AppRoutes.more).firstOrNull;
    final features = visible
        .where((d) => d.primary && d.path != AppRoutes.more && d.path != AppRoutes.home)
        .take(maxPrimaryDestinations - 1)
        .toList();

    final tabs = <AppDestination>[];
    if (features.length <= 2) {
      if (features.isNotEmpty) tabs.add(features.first);
      if (home != null) tabs.add(home);
      if (features.length > 1) tabs.add(features[1]);
    } else {
      tabs.addAll(features.take(2)); // first two features on the left
      if (home != null) tabs.add(home); // home in the center
      tabs.addAll(features.skip(2)); // remaining features on the right
    }
    if (more != null) tabs.add(more);

    return tabs;
  }

  Set<AppDestination> get _pinnedPrimary => primary.where((d) => d.path != AppRoutes.more).toSet();

  bool _includeInMenus(AppDestination destination) {
    if (destination.path == AppRoutes.more) return false;
    if (destination.group == null) return false;
    if (agencyHubPaths.contains(destination.path)) return false;
    if (featurePageOnlyPaths.contains(destination.path)) return false;
    return true;
  }

  /// Destinations for the More screen, excluding bottom-bar pins.
  /// Agency keeps Team and other org pages; departments / roles live on the Agency hub.
  Map<NavGroup, List<AppDestination>> get secondaryGroups => _groups(excludePrimary: true);

  /// Drawer / rail mega-menu. Drawer omits bottom-nav pins; permanent rail keeps them.
  Map<NavGroup, List<AppDestination>> sidebarGroups({bool includePrimary = false}) =>
      _groups(excludePrimary: !includePrimary);

  /// Groups in [NavGroup] declaration order so Work stays above the rest.
  Map<NavGroup, List<AppDestination>> _groups({required bool excludePrimary}) {
    final pinned = _pinnedPrimary;
    final groups = <NavGroup, List<AppDestination>>{};
    for (final group in NavGroup.values) {
      for (final destination in visible) {
        if (destination.group != group) continue;
        if (!_includeInMenus(destination)) continue;
        if (excludePrimary && pinned.contains(destination)) continue;
        (groups[group] ??= []).add(destination);
      }
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
