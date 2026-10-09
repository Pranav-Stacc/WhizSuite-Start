import 'package:flutter/material.dart';

import '../../core/contracts/contracts.g.dart';
import '../../core/navigation/feature_module.dart';
import 'knowledge_routes.dart';
import 'presentation/article_reader_screen.dart';
import 'presentation/knowledge_screen.dart';

final knowledgeModule = FeatureModule(
  destinations: [
    AppDestination(
      path: KnowledgeRoutes.root,
      icon: Icons.menu_book_outlined,
      selectedIcon: Icons.menu_book,
      label: (l10n) => l10n.navKnowledge,
      anyOf: const [Permissions.orgView],
      audiences: staffOnly,
      group: NavGroup.agency,
    ),
  ],
  routes: [
    destinationRoute(
      KnowledgeRoutes.root,
      (_) => const KnowledgeScreen(),
      routes: [
        childRoute(
          ':${KnowledgeRoutes.detailParam}',
          (state) => ArticleReaderScreen(articleId: state.pathParameters[KnowledgeRoutes.detailParam]!),
        ),
      ],
    ),
  ],
);
