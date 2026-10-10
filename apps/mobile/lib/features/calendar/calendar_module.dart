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
      anyOf: const [Permissions.calendarView],
      audiences: staffOnly,
      group: NavGroup.work,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      CalendarRoutes.root,
      (state) => CalendarScreen(initialClientId: state.uri.queryParameters[CalendarRoutes.clientQuery]),
    ),
  ],
);
