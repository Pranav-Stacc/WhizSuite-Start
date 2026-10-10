import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'media_routes.dart';
import 'presentation/media_detail_screen.dart';
import 'presentation/media_screen.dart';

final mediaModule = FeatureModule(
  destinations: [
    AppDestination(
      path: MediaRoutes.root,
      icon: Icons.perm_media_outlined,
      selectedIcon: Icons.perm_media,
      label: (l10n) => l10n.navMedia,
      anyOf: const [Permissions.filesView],
      audiences: staffOnly,
      group: NavGroup.content,
    ),
  ],
  routes: [
    destinationRoute(
      MediaRoutes.root,
      (state) => MediaScreen(initialClientId: state.uri.queryParameters[MediaRoutes.clientQuery]),
      routes: [
        childRoute(
          ':${MediaRoutes.detailParam}',
          (state) => MediaDetailScreen(assetId: state.pathParameters[MediaRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
