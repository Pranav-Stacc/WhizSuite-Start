import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/knowledge_repository.dart';
import '../domain/article.dart';

final articlesProvider = FutureProvider.autoDispose<List<Article>>(
  (ref) => ref.watch(knowledgeRepositoryProvider).list(),
);

final articleProvider = FutureProvider.autoDispose.family<Article, String>(
  (ref, id) => ref.watch(knowledgeRepositoryProvider).get(id),
);

/// Article mutations; each refreshes every view that shows articles.
class KnowledgeActions {
  KnowledgeActions(this._ref);

  final Ref _ref;

  KnowledgeRepository get _repo => _ref.read(knowledgeRepositoryProvider);

  Future<Article> create(ArticleInput input) async {
    final article = await _repo.create(input);
    _ref.invalidate(articlesProvider);
    return article;
  }

  Future<void> update(String id, ArticleInput input) async {
    await _repo.update(id, input);
    _ref
      ..invalidate(articlesProvider)
      ..invalidate(articleProvider(id));
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(articlesProvider);
  }
}

final knowledgeActionsProvider = Provider<KnowledgeActions>(KnowledgeActions.new);
