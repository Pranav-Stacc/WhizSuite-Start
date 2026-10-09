import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/search_result.dart';

/// Workspace search. The API gates the endpoint with `org.view` and client-scopes
/// results for portal members (leads are omitted when scoped).
class SearchRepository {
  SearchRepository(this._api);

  final ApiClient _api;

  Future<SearchResults> search(String query) async {
    final q = query.trim();
    if (q.length < searchMinQueryLength) return SearchResults.empty;
    final body = jsonObject(await _api.get<Object?>(_api.org('search'), query: {'q': q}));
    return SearchResults.fromJson(body);
  }
}

final searchRepositoryProvider = Provider<SearchRepository>(
  (ref) => SearchRepository(ref.watch(apiClientProvider)),
);
