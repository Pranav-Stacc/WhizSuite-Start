import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/template_detail_screen.dart';
import 'presentation/templates_screen.dart';
import 'templates_routes.dart';

final templatesModule = FeatureModule(
  destinations: [
    AppDestination(
      path: TemplatesRoutes.root,
      icon: Icons.dashboard_customize_outlined,
      selectedIcon: Icons.dashboard_customize,
      label: (l10n) => l10n.navTemplates,
      anyOf: const [Permissions.orgSettingsManage],
      audiences: staffOnly,
      group: NavGroup.agency,
    ),
  ],
  routes: [
    destinationRoute(
      TemplatesRoutes.root,
      (_) => const TemplatesScreen(),
      routes: [
        childRoute(
          ':${TemplatesRoutes.detailParam}',
          (state) => TemplateDetailScreen(templateId: state.pathParameters[TemplatesRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
