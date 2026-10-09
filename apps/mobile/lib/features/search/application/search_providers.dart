import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/search_repository.dart';
import '../domain/search_result.dart';

/// Debounced query string the search screen commits after the member pauses typing.
final searchQueryProvider = NotifierProvider.autoDispose<SearchQuery, String>(SearchQuery.new);

class SearchQuery extends Notifier<String> {
  @override
  String build() => '';

  void set(String value) => state = value;
}

final searchResultsProvider = FutureProvider.autoDispose<SearchResults>((ref) async {
  final query = ref.watch(searchQueryProvider);
  return ref.watch(searchRepositoryProvider).search(query);
});
