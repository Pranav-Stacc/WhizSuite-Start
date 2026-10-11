import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/role_detail_screen.dart';
import 'presentation/role_editor_screen.dart';
import 'presentation/roles_screen.dart';
import 'roles_routes.dart';

final rolesModule = FeatureModule(
  destinations: [
    AppDestination(
      path: RolesRoutes.root,
      icon: Icons.admin_panel_settings_outlined,
      selectedIcon: Icons.admin_panel_settings,
      label: (l10n) => l10n.navRoles,
      anyOf: const [Permissions.rolesManage],
      audiences: staffOnly,
      group: NavGroup.agency,
    ),
  ],
  routes: [
    destinationRoute(
      RolesRoutes.root,
      (_) => const RolesScreen(),
      routes: [
        childRoute(
          RolesRoutes.createSegment,
          (state) => RoleEditorScreen(templateId: state.uri.queryParameters[RolesRoutes.templateQuery]),
        ),
        childRoute(
          ':${RolesRoutes.detailParam}',
          (state) => RoleDetailScreen(roleId: state.pathParameters[RolesRoutes.detailParam]!),
          routes: [
            childRoute(
              RolesRoutes.editSegment,
              (state) => RoleEditorScreen(roleId: state.pathParameters[RolesRoutes.detailParam]),
            ),
          ],
        ),
      ],
    ),
  ],
);
