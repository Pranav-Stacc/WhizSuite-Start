import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/article.dart';

class KnowledgeRepository {
  KnowledgeRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('knowledge/articles');

  Future<List<Article>> list() async => jsonList(await _api.get<Object?>(_base)).map(Article.fromJson).toList();

  Future<Article> get(String id) async => Article.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Article> create(ArticleInput input) async =>
      Article.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<void> update(String id, ArticleInput input) => _api.patch<Object?>('$_base/$id', body: input.toJson());

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');
}

final knowledgeRepositoryProvider =
    Provider<KnowledgeRepository>((ref) => KnowledgeRepository(ref.watch(apiClientProvider)));
