import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'agent_routes.dart';
import 'presentation/agent_screen.dart';

final agentModule = FeatureModule(
  destinations: [
    AppDestination(
      path: AgentRoutes.root,
      icon: Icons.auto_awesome_outlined,
      selectedIcon: Icons.auto_awesome,
      label: (l10n) => l10n.agentTitle,
      anyOf: const [Permissions.aiView, Permissions.aiChat],
      audiences: staffOnly,
      group: NavGroup.automate,
    ),
  ],
  routes: [
    destinationRoute(AgentRoutes.root, (_) => const AgentScreen()),
  ],
);
