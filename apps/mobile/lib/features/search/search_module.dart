import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'presentation/search_screen.dart';
import 'search_routes.dart';

final searchModule = FeatureModule(
  destinations: [
    AppDestination(
      path: SearchRoutes.root,
      icon: Icons.search,
      selectedIcon: Icons.search,
      label: (l10n) => l10n.navSearch,
      anyOf: const [Permissions.orgView],
      audiences: everyAudience,
      primary: false,
    ),
  ],
  routes: [
    destinationRoute(SearchRoutes.root, (_) => const SearchScreen()),
  ],
);
