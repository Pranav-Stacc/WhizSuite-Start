import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../data/audit_repository.dart';
import '../domain/audit_entry.dart';

/// Loaded audit records plus the cursor for the next page.
class AuditFeed {
  const AuditFeed({required this.entries, this.nextCursor, this.loadingMore = false, this.loadMoreError});

  final List<AuditEntry> entries;
  final String? nextCursor;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get hasMore => nextCursor != null;

  AuditFeed copyWith({
    List<AuditEntry>? entries,
    String? nextCursor,
    bool clearCursor = false,
    bool? loadingMore,
    Object? loadMoreError,
  }) =>
      AuditFeed(
        entries: entries ?? this.entries,
        nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreError: loadMoreError,
      );
}

/// Cursor-paginated audit log: the first page loads on watch, [loadMore] appends the next.
class AuditFeedController extends AsyncNotifier<AuditFeed> {
  @override
  Future<AuditFeed> build() async {
    final page = await ref.watch(auditRepositoryProvider).page();
    return AuditFeed(entries: page.items, nextCursor: page.hasMore ? page.nextCursor : null);
  }

  /// Appends the next page; a failure is kept on the feed so the list can offer a retry.
  Future<void> loadMore() async {
    final current = state.value;
    final cursor = current?.nextCursor;
    if (current == null || cursor == null || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true));
    try {
      final page = await ref.read(auditRepositoryProvider).page(cursor: cursor);
      if (!ref.mounted) return;
      final seen = {for (final entry in current.entries) entry.id};
      state = AsyncData(
        current.copyWith(
          entries: [...current.entries, ...page.items.where((e) => seen.add(e.id))],
          nextCursor: page.nextCursor,
          clearCursor: !page.hasMore,
          loadingMore: false,
        ),
      );
    } on ApiException catch (error) {
      if (ref.mounted) state = AsyncData(current.copyWith(loadingMore: false, loadMoreError: error));
    }
  }
}

final auditFeedProvider = AsyncNotifierProvider.autoDispose<AuditFeedController, AuditFeed>(AuditFeedController.new);
