import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/time_screen.dart';
import 'time_routes.dart';

final timeModule = FeatureModule(
  destinations: [
    AppDestination(
      path: TimeRoutes.root,
      icon: Icons.timer_outlined,
      selectedIcon: Icons.timer,
      label: (l10n) => l10n.navTime,
      anyOf: const [Permissions.timeTrack],
      audiences: staffOnly,
      group: NavGroup.work,
    ),
  ],
  routes: [destinationRoute(TimeRoutes.root, (_) => const TimeScreen())],
);
