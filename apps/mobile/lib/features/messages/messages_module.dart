import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'messages_routes.dart';
import 'presentation/conversation_screen.dart';
import 'presentation/messages_screen.dart';
import 'presentation/whiz_chat_screen.dart';

final messagesModule = FeatureModule(
  destinations: [
    AppDestination(
      path: MessagesRoutes.root,
      icon: Icons.forum_outlined,
      selectedIcon: Icons.forum,
      label: (l10n) => l10n.navMessages,
      anyOf: const [Permissions.chatView],
      audiences: everyAudience,
      group: NavGroup.clients,
      primary: true,
    ),
  ],
  routes: [
    destinationRoute(
      MessagesRoutes.root,
      (_) => const MessagesScreen(),
      routes: [
        childRoute(
          'whiz',
          (_) => const WhizChatScreen(),
        ),
        childRoute(
          ':${MessagesRoutes.detailParam}',
          (state) => ConversationScreen(threadId: state.pathParameters[MessagesRoutes.detailParam] ?? ''),
        ),
      ],
    ),
  ],
);
