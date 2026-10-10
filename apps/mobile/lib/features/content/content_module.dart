import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'content_routes.dart';
import 'presentation/content_compose_screen.dart';
import 'presentation/content_detail_screen.dart';
import 'presentation/content_screen.dart';

DateTime? _parseScheduledAt(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw)?.toLocal();
}

final contentModule = FeatureModule(
  destinations: [
    AppDestination(
      path: ContentRoutes.root,
      icon: Icons.auto_awesome_mosaic_outlined,
      selectedIcon: Icons.auto_awesome_mosaic,
      label: (l10n) => l10n.navContent,
      anyOf: const [Permissions.contentView],
      audiences: everyAudience,
      group: NavGroup.content,
      primary: false,
    ),
  ],
  routes: [
    destinationRoute(
      ContentRoutes.root,
      (state) => ContentScreen(
            initialClientId: state.uri.queryParameters[ContentRoutes.clientQuery],
            initialTab: state.uri.queryParameters[ContentRoutes.tabQuery],
          ),
      routes: [
        childRoute(
          ContentRoutes.composeSegment,
          (state) => ContentComposeScreen(
                initialClientId: state.uri.queryParameters[ContentRoutes.clientQuery],
                initialScheduledAt: _parseScheduledAt(state.uri.queryParameters[ContentRoutes.scheduledAtQuery]),
              ),
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
