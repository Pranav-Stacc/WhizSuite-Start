import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'custom_fields_routes.dart';
import 'presentation/custom_fields_screen.dart';

final customFieldsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: CustomFieldsRoutes.root,
      icon: Icons.tune_outlined,
      selectedIcon: Icons.tune,
      label: (l10n) => l10n.navCustomFields,
      anyOf: const [Permissions.orgSettingsManage],
      audiences: staffOnly,
      // Opened from feature screens (projects, tasks, …) — not top-level nav.
    ),
  ],
  routes: [destinationRoute(CustomFieldsRoutes.root, (_) => const CustomFieldsScreen())],
);
