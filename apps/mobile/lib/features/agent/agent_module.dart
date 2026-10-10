import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import '../messages/messages_routes.dart';
import 'agent_routes.dart';

/// Whiz AI lives inside Messages. `/agent` redirects there; More menu opens Whiz.
final agentModule = FeatureModule(
  destinations: [
    AppDestination(
      path: MessagesRoutes.whiz,
      icon: Icons.auto_awesome_outlined,
      selectedIcon: Icons.auto_awesome,
      label: (l10n) => l10n.messagesWhiz,
      anyOf: const [Permissions.aiView, Permissions.aiChat],
      audiences: staffOnly,
      group: NavGroup.automate,
    ),
  ],
  routes: [
    GoRoute(
      path: AgentRoutes.root,
      redirect: (_, _) => MessagesRoutes.whiz,
      routes: [
        GoRoute(
          path: ':${AgentRoutes.detailParam}',
          redirect: (_, _) => MessagesRoutes.whiz,
        ),
      ],
    ),
  ],
);
