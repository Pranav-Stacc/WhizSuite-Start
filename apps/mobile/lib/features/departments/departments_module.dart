import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'departments_routes.dart';
import 'presentation/departments_screen.dart';

final departmentsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: DepartmentsRoutes.root,
      icon: Icons.account_tree_outlined,
      selectedIcon: Icons.account_tree,
      label: (l10n) => l10n.navDepartments,
      anyOf: const [Permissions.orgView],
      audiences: staffOnly,
      group: NavGroup.agency,
    ),
  ],
  routes: [destinationRoute(DepartmentsRoutes.root, (_) => const DepartmentsScreen())],
);
