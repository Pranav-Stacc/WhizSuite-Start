import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'integrations_routes.dart';
import 'presentation/integrations_screen.dart';

final integrationsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: IntegrationsRoutes.root,
      icon: Icons.extension_outlined,
      selectedIcon: Icons.extension,
      label: (l10n) => l10n.navIntegrations,
      anyOf: const [Permissions.integrationsManage],
      audiences: staffOnly,
      group: NavGroup.automate,
    ),
  ],
  routes: [destinationRoute(IntegrationsRoutes.root, (_) => const IntegrationsScreen())],
);
