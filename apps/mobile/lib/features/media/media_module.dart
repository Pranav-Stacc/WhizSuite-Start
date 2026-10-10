import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'media_routes.dart';
import 'presentation/media_detail_screen.dart';
import 'presentation/media_screen.dart';

final mediaModule = FeatureModule(
  // Assets stay reachable via client/project screens — not a main sidebar destination.
  destinations: const [],
  routes: [
    destinationRoute(
      MediaRoutes.root,
      (_) => const MediaScreen(),
      routes: [
        childRoute(
          ':${MediaRoutes.detailParam}',
          (state) => MediaDetailScreen(assetId: state.pathParameters[MediaRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
