import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'clients_routes.dart';
import 'presentation/client_detail_screen.dart';
import 'presentation/clients_screen.dart';

final clientsModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ClientsRoutes.root,
      icon: Icons.business_outlined,
      selectedIcon: Icons.business,
      label: (l10n) => l10n.navClients,
      anyOf: const [Permissions.clientsView],
      audiences: staffOnly,
      group: NavGroup.clients,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      ClientsRoutes.root,
      (_) => const ClientsScreen(),
      routes: [
        childRoute(
          ':${ClientsRoutes.detailParam}',
          (state) => ClientDetailScreen(clientId: state.pathParameters[ClientsRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
