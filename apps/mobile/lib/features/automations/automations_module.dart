import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'automations_routes.dart';
import 'presentation/automation_detail_screen.dart';
import 'presentation/automations_screen.dart';

final automationsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: AutomationsRoutes.root,
      icon: Icons.bolt_outlined,
      selectedIcon: Icons.bolt,
      label: (l10n) => l10n.navAutomations,
      anyOf: const [Permissions.automationsManage],
      audiences: staffOnly,
      group: NavGroup.automate,
    ),
  ],
  routes: [
    destinationRoute(
      AutomationsRoutes.root,
      (_) => const AutomationsScreen(),
      routes: [
        childRoute(
          ':${AutomationsRoutes.detailParam}',
          (state) => AutomationDetailScreen(automationId: state.pathParameters[AutomationsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
