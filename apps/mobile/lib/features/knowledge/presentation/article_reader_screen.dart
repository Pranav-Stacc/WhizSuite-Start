import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../application/knowledge_controller.dart';
import '../domain/article.dart';
import '../knowledge_routes.dart';
import 'article_body_view.dart';
import 'article_forms.dart';
import 'article_labels.dart';

class ArticleReaderScreen extends ConsumerWidget {
  const ArticleReaderScreen({required this.articleId, super.key});

  final String articleId;

  Future<void> _edit(BuildContext context, WidgetRef ref, Article article) async {
    final l10n = AppLocalizations.of(context);
    final saved = await showArticleForm(context, ref, article: article);
    if (saved && context.mounted) showToast(context, l10n.savedToast);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Article article) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(article.title),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final deleted = await runAction(context, () => ref.read(knowledgeActionsProvider).delete(article.id));
    if (deleted && context.mounted) {
      showToast(context, l10n.deletedToast);
      context.go(KnowledgeRoutes.root);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final article = ref.watch(articleProvider(articleId));
    final loaded = article.value;
    final error = Theme.of(context).colorScheme.error;

    return PageScaffold(
      title: loaded == null ? l10n.knowledgeTitle : articleCategoryLabel(l10n, loaded.category),
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.orgSettingsManage],
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: l10n.knowledgeEdit,
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _edit(context, ref, loaded),
                ),
                IconButton(
                  tooltip: l10n.delete,
                  icon: Icon(Icons.delete_outline, color: error),
                  onPressed: () => _delete(context, ref, loaded),
                ),
              ],
            ),
          ),
      ],
      body: AsyncValueView<Article>(
        value: article,
        onRetry: () => ref.invalidate(articleProvider(articleId)),
        data: (article) => _Reader(
          article: article,
          onRefresh: () => ref.refresh(articleProvider(articleId).future),
        ),
      ),
    );
  }
}

class _Reader extends ConsumerWidget {
  const _Reader({required this.article, required this.onRefresh});

  /// Comfortable measure for long-form reading (~70 characters per line).
  static const _maxWidth = 680.0;

  final Article article;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final author = ref.watch(memberDirectoryProvider).value?.nameOf(article.authorId);
    final meta = text.bodySmall?.copyWith(color: tokens.muted);

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: _maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FadeSlideIn(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusBadge(
                        label: articleCategoryLabel(l10n, article.category),
                        tone: articleCategoryTone(article.category),
                      ),
                      SizedBox(height: tokens.md),
                      Semantics(
                        header: true,
                        child: Text(article.title, style: text.headlineMedium?.copyWith(fontWeight: FontWeight.w600)),
                      ),
                      SizedBox(height: tokens.md),
                      Row(
                        children: [
                          if (author != null) ...[
                            InitialsAvatar(name: author, seed: article.authorId, size: 28),
                            SizedBox(width: tokens.sm),
                          ],
                          Expanded(
                            child: Text(
                              [
                                ?author,
                                l10n.knowledgeUpdated(formats.relative(article.updatedAt)),
                                l10n.knowledgeReadTime(article.readingMinutes),
                              ].join(' · '),
                              style: meta,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(padding: EdgeInsets.symmetric(vertical: tokens.lg), child: const Divider()),
                FadeSlideIn(
                  index: 1,
                  child: article.body.trim().isEmpty
                      ? Text(l10n.knowledgeBodyEmpty, style: meta)
                      : ArticleBodyView(body: article.body),
                ),
                SizedBox(height: tokens.xl),
                Text(
                  l10n.knowledgeVersionFooter(article.version, formats.date(article.createdAt)),
                  style: meta,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
