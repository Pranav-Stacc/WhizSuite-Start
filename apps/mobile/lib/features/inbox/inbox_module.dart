import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'inbox_routes.dart';
import 'presentation/conversation_screen.dart';
import 'presentation/inbox_screen.dart';

final inboxModule = FeatureModule(
  destinations: [
    AppDestination(
      path: InboxRoutes.root,
      icon: Icons.forum_outlined,
      selectedIcon: Icons.forum,
      label: (l10n) => l10n.navInbox,
      anyOf: const [Permissions.inboxView],
      audiences: staffOnly,
      group: NavGroup.clients,
    ),
  ],
  routes: [
    destinationRoute(
      InboxRoutes.root,
      (_) => const InboxScreen(),
      routes: [
        childRoute(
          ':${InboxRoutes.detailParam}',
          (state) => ConversationScreen(conversationId: state.pathParameters[InboxRoutes.detailParam] ?? ''),
        ),
      ],
    ),
  ],
);
