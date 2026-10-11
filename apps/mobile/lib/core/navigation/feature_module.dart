import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_pages.dart';
import '../../features/access/domain/access_policy.dart';
import '../../l10n/app_localizations.dart';

/// Who a destination is built for. Client memberships get the portal experience;
/// within each audience, visibility is decided purely by permissions.
enum Audience { staff, portal }

const Set<Audience> everyAudience = {Audience.staff, Audience.portal};
const Set<Audience> staffOnly = {Audience.staff};
const Set<Audience> portalOnly = {Audience.portal};

/// Sections of the "More" menu, mirroring the web sidebar groups.
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

  /// Candidate for the bottom navigation bar when permitted.
  final bool primary;

  bool isVisibleTo(Audience audience, AccessPolicy policy) => audiences.contains(audience) && policy.canAny(anyOf);
}

/// What a feature contributes to the app: its navigable destinations and the routes
/// (rendered inside the signed-in shell) that back them.
class FeatureModule {
  const FeatureModule({this.destinations = const [], this.routes = const []});

  final List<AppDestination> destinations;
  final List<RouteBase> routes;
}

/// Top-level shell destination (no transition). Use [GoRouter.go] for tab/rail switches;
/// use [GoRouter.push] when opening from another screen so back can pop.
GoRoute destinationRoute(String path, Widget Function(GoRouterState state) build, {List<RouteBase> routes = const []}) =>
    GoRoute(
      path: path,
      pageBuilder: (context, state) => NoTransitionPage(key: state.pageKey, child: build(state)),
      routes: routes,
    );

/// Nested detail/create/edit route. Always open with [GoRouter.push] (not [GoRouter.go]).
GoRoute childRoute(String path, Widget Function(GoRouterState state) build, {List<RouteBase> routes = const []}) =>
    GoRoute(
      path: path,
      pageBuilder: (context, state) => slidePushPage(key: state.pageKey, child: build(state)),
      routes: routes,
    );
