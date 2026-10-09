import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'content_routes.dart';
import 'presentation/content_compose_screen.dart';
import 'presentation/content_detail_screen.dart';
import 'presentation/content_screen.dart';

final contentModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ContentRoutes.root,
      icon: Icons.auto_awesome_mosaic_outlined,
      selectedIcon: Icons.auto_awesome_mosaic,
      label: (l10n) => l10n.navContent,
      anyOf: const [Permissions.contentView],
      audiences: staffOnly,
      group: NavGroup.content,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      ContentRoutes.root,
      (_) => const ContentScreen(),
      routes: [
        childRoute(
          ContentRoutes.composeSegment,
          (state) => ContentComposeScreen(initialClientId: state.uri.queryParameters[ContentRoutes.clientQuery]),
        ),
        childRoute(
          ':${ContentRoutes.detailParam}',
          (state) => ContentDetailScreen(contentId: state.pathParameters[ContentRoutes.detailParam]!),
          routes: [
            childRoute(
              ContentRoutes.editSegment,
              (state) => ContentComposeScreen(contentId: state.pathParameters[ContentRoutes.detailParam]),
            ),
          ],
        ),
      ],
    ),
  ],
);
