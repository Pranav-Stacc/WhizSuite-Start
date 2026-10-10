import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/team_screen.dart';
import 'team_routes.dart';

final teamModule = FeatureModule(
  destinations: [
    AppDestination(
      path: TeamRoutes.root,
      icon: Icons.apartment_outlined,
      selectedIcon: Icons.apartment,
      label: (l10n) => l10n.navTeam,
      anyOf: const [Permissions.membersView],
      audiences: staffOnly,
      group: NavGroup.agency,
      primary: true,
    ),
  ],
  routes: [destinationRoute(TeamRoutes.root, (_) => const TeamScreen())],
);
