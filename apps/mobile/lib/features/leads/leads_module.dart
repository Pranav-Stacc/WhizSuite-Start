import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'leads_routes.dart';
import 'presentation/lead_detail_screen.dart';
import 'presentation/leads_screen.dart';

final leadsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: LeadsRoutes.root,
      icon: Icons.filter_alt_outlined,
      selectedIcon: Icons.filter_alt,
      label: (l10n) => l10n.navLeads,
      anyOf: const [Permissions.leadsView],
      audiences: staffOnly,
      group: NavGroup.clients,
    ),
  ],
  routes: [
    destinationRoute(
      LeadsRoutes.root,
      (_) => const LeadsScreen(),
      routes: [
        childRoute(
          ':${LeadsRoutes.detailParam}',
          (state) => LeadDetailScreen(leadId: state.pathParameters[LeadsRoutes.detailParam] ?? ''),
        ),
      ],
    ),
  ],
);
