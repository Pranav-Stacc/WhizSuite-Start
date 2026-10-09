import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'calendar_routes.dart';
import 'presentation/calendar_screen.dart';

final calendarModule = FeatureModule(
  destinations: [
    AppDestination(
      path: CalendarRoutes.root,
      icon: Icons.calendar_month_outlined,
      selectedIcon: Icons.calendar_month,
      label: (l10n) => l10n.navCalendar,
      anyOf: const [Permissions.projectsView],
      audiences: staffOnly,
      group: NavGroup.work,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(CalendarRoutes.root, (_) => const CalendarScreen()),
  ],
);
