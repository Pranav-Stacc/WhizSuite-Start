import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import '../../features/access/domain/access_policy.dart';
import '../../features/auth/domain/session.dart';
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
  _settings,
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
