import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/workflow_detail_screen.dart';
import 'presentation/workflows_screen.dart';
import 'workflows_routes.dart';

final workflowsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: WorkflowsRoutes.root,
      icon: Icons.account_tree_outlined,
      selectedIcon: Icons.account_tree,
      label: (l10n) => l10n.navWorkflows,
      anyOf: const [Permissions.workflowsManage],
      audiences: staffOnly,
      group: NavGroup.automate,
    ),
  ],
  routes: [
    destinationRoute(
      WorkflowsRoutes.root,
      (_) => const WorkflowsScreen(),
      routes: [
        childRoute(
          ':${WorkflowsRoutes.detailParam}',
          (state) => WorkflowDetailScreen(workflowId: state.pathParameters[WorkflowsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
