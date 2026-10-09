import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/project_detail_screen.dart';
import 'presentation/projects_screen.dart';
import 'projects_routes.dart';

final projectsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ProjectsRoutes.root,
      icon: Icons.folder_outlined,
      selectedIcon: Icons.folder,
      label: (l10n) => l10n.navProjects,
      anyOf: const [Permissions.projectsView],
      audiences: staffOnly,
      group: NavGroup.work,
    ),
  ],
  routes: [
    destinationRoute(
      ProjectsRoutes.root,
      (_) => const ProjectsScreen(),
      routes: [
        childRoute(
          ':${ProjectsRoutes.detailParam}',
          (state) => ProjectDetailScreen(projectId: state.pathParameters[ProjectsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
