import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/task_detail_screen.dart';
import 'presentation/tasks_screen.dart';
import 'tasks_routes.dart';

final tasksModule = FeatureModule(
  destinations: [
    AppDestination(
      path: TasksRoutes.root,
      icon: Icons.task_alt_outlined,
      selectedIcon: Icons.task_alt,
      label: (l10n) => l10n.navTasks,
      anyOf: const [Permissions.tasksView],
      audiences: staffOnly,
      group: NavGroup.work,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      TasksRoutes.root,
      (_) => const TasksScreen(),
      routes: [
        childRoute(
          ':${TasksRoutes.detailParam}',
          (state) => TaskDetailScreen(taskId: state.pathParameters[TasksRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
