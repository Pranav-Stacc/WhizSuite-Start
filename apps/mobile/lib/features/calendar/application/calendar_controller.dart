import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../tasks/application/tasks_controller.dart';
import '../../tasks/domain/task.dart';
import '../data/calendar_repository.dart';
import '../domain/calendar_entry.dart';
import '../domain/calendar_item.dart';

final calendarItemsProvider = FutureProvider.autoDispose<List<CalendarItem>>(
  (ref) => ref.watch(calendarRepositoryProvider).list(),
);

bool _can(Ref ref, String permission) => ref.watch(accessPolicyProvider.select((policy) => policy.can(permission)));

/// Scheduled content; null when the member cannot see content.
final calendarContentProvider = FutureProvider.autoDispose<List<ScheduledContent>?>((ref) async {
  if (!_can(ref, Permissions.contentView)) return null;
  return ref.watch(calendarRepositoryProvider).scheduledContent();
});

/// Everything on the calendar. Prefers the unified API feed; falls back to local merge.
class CalendarFeed {
  const CalendarFeed({required this.entries, this.partial = false});

  final List<CalendarEntry> entries;
  final bool partial;
}

final calendarFeedProvider = FutureProvider.autoDispose<CalendarFeed>((ref) async {
  final repo = ref.watch(calendarRepositoryProvider);
  final now = DateTime.now();
  final from = DateTime(now.year, now.month - 1, 1);
  final to = DateTime(now.year, now.month + 2, 1);

  try {
    final items = await repo.feed(from: from, to: to);
    return CalendarFeed(
      entries: [
        for (final item in items)
          CalendarEntry.fromItem(
            item,
            editable: creatableCalendarSourceTypes.contains(item.sourceType) ||
                item.sourceType == CalendarSourceTypes.shoot,
          ),
      ],
    );
  } on ApiException {
    // Fall through to federated merge when the feed endpoint is unavailable.
  }

  final canSeeTasks = _can(ref, Permissions.tasksView);
  var partial = true;

  Future<T> tolerant<T>(Future<T> future, T fallback) async {
    try {
      return await future;
    } on ApiException {
      return fallback;
    }
  }

  final contentFuture = tolerant(ref.watch(calendarContentProvider.future), null);
  final tasksFuture = canSeeTasks ? tolerant(ref.watch(tasksProvider.future), const <Task>[]) : null;
  final projectsFuture = canSeeTasks ? tolerant(ref.watch(projectDirectoryProvider.future), Directory.empty) : null;

  final items = await ref.watch(calendarItemsProvider.future);
  final content = await contentFuture;
  final tasks = await tasksFuture ?? const <Task>[];
  final projects = await projectsFuture ?? Directory.empty;

  return CalendarFeed(
    partial: partial,
    entries: [
      for (final item in items) CalendarEntry.fromItem(item),
      for (final piece in content ?? const <ScheduledContent>[]) ?CalendarEntry.fromContent(piece),
      for (final task in tasks)
        if (!task.isDone) ?CalendarEntry.fromTask(task, clientId: projects[task.projectId]?.parentId),
    ],
  );
});

/// Calendar item mutations; the feed and every derived view refresh through [calendarItemsProvider].
class CalendarActions {
  CalendarActions(this._ref);

  final Ref _ref;

  CalendarRepository get _repo => _ref.read(calendarRepositoryProvider);

  Future<CalendarItem> create(CalendarItemInput input) async {
    final item = await _repo.create(input);
    _ref.invalidate(calendarItemsProvider);
    _ref.invalidate(calendarFeedProvider);
    return item;
  }

  Future<void> update(CalendarItem item, CalendarItemInput input) async {
    await _repo.update(item, input);
    _ref.invalidate(calendarItemsProvider);
    _ref.invalidate(calendarFeedProvider);
  }
}

final calendarActionsProvider = Provider<CalendarActions>(CalendarActions.new);
