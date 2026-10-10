import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/knowledge_controller.dart';
import '../domain/article.dart';
import '../knowledge_routes.dart';
import 'article_card.dart';
import 'article_forms.dart';
import 'article_labels.dart';

class KnowledgeScreen extends ConsumerStatefulWidget {
  const KnowledgeScreen({super.key});

  @override
  ConsumerState<KnowledgeScreen> createState() => _KnowledgeScreenState();
}

class _KnowledgeScreenState extends ConsumerState<KnowledgeScreen> {
  String? _category;

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showArticleForm(context, ref);
    if (created && mounted) showToast(context, l10n.knowledgePublishedToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final articles = ref.watch(articlesProvider);
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final items = articles.value ?? const <Article>[];
    final categoriesUsed = {for (final a in items) a.category}.length;
    final readingMinutes = items.fold<int>(0, (sum, a) => sum + a.readingMinutes);

    return PageScaffold(
      title: l10n.knowledgeTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.orgSettingsManage],
        child: CreateFab(label: l10n.knowledgeNew, onPressed: _create),
      ),
      body: ResourceList<Article>(
        value: articles,
        onRefresh: () => ref.refresh(articlesProvider.future),
        minTileWidth: 320,
        tileHeight: 196,
        searchHint: l10n.knowledgeSearch,
        matches: (article, query) =>
            article.title.toLowerCase().contains(query) || article.body.toLowerCase().contains(query),
        filter: (article) => _category == null || article.category == _category,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (items.isNotEmpty) ...[
              Row(
                children: [
                  Expanded(
                    child: MetricTile(
                      label: l10n.knowledgeStatArticles,
                      icon: Icons.menu_book_outlined,
                      value: '${items.length}',
                    ),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: MetricTile(
                      label: l10n.knowledgeStatCategories,
                      icon: Icons.category_outlined,
                      value: '$categoriesUsed',
                    ),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: MetricTile(
                      label: l10n.knowledgeStatReading,
                      icon: Icons.schedule_outlined,
                      value: context.formats.duration(readingMinutes),
                    ),
                  ),
                ],
              ),
              SizedBox(height: tokens.md),
            ],
            FilterBar<String>(
              options: ArticleCategories.values,
              selected: _category,
              labelOf: (category) => articleCategoryLabel(l10n, category),
              countOf: (category) => category == null ? items.length : items.where((a) => a.category == category).length,
              onSelected: (category) => setState(() => _category = category),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.menu_book_outlined,
          title: l10n.knowledgeEmpty,
          body: l10n.knowledgeEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.knowledgeNew)),
          ),
        ),
        itemBuilder: (context, article) => ArticleCard(
          article: article,
          authorName: members.nameOf(article.authorId),
          onTap: () => context.push(KnowledgeRoutes.detail(article.id)),
        ),
      ),
    );
  }
}
