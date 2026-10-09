import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'audit_routes.dart';
import 'presentation/audit_screen.dart';

final auditModule = FeatureModule(
  destinations: [
    AppDestination(
      path: AuditRoutes.root,
      icon: Icons.policy_outlined,
      selectedIcon: Icons.policy,
      label: (l10n) => l10n.navAudit,
      anyOf: const [Permissions.auditView],
      audiences: staffOnly,
      group: NavGroup.agency,
    ),
  ],
  routes: [destinationRoute(AuditRoutes.root, (_) => const AuditScreen())],
);
