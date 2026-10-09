import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../tasks/domain/task.dart';
import 'calendar_item.dart';

/// Content with a schedule, as the calendar needs it (`GET content`).
class ScheduledContent {
  const ScheduledContent({required this.id, required this.title, required this.status, this.clientId, this.scheduledAt});

  factory ScheduledContent.fromJson(Json json) => ScheduledContent(
        id: json.str('id'),
        title: json.str('title'),
        status: json.str('status', ContentStatuses.draft),
        clientId: json.strOrNull('clientId'),
        scheduledAt: json.date('scheduledAt'),
      );

  final String id;
  final String title;
  final String status;
  final String? clientId;
  final DateTime? scheduledAt;
}

/// One thing on the calendar: a stored item, a scheduled piece of content or an open task deadline.
class CalendarEntry {
  const CalendarEntry({
    required this.key,
    required this.sourceType,
    required this.title,
    required this.start,
    this.end,
    this.allDay = false,
    this.clientId,
    this.projectId,
    this.item,
    this.taskId,
    this.contentId,
    this.status,
  });

  factory CalendarEntry.fromItem(CalendarItem item) => CalendarEntry(
        key: 'item:${item.id}',
        sourceType: item.sourceType,
        title: item.title,
        start: item.startsAt,
        end: item.endsAt,
        allDay: item.allDay,
        clientId: item.clientId,
        projectId: item.projectId,
        item: item,
      );

  /// Null when the task has no due date.
  static CalendarEntry? fromTask(Task task, {String? clientId}) {
    final due = task.dueDate;
    if (due == null) return null;
    return CalendarEntry(
      key: 'task:${task.id}',
      sourceType: CalendarSourceTypes.task,
      title: task.title,
      start: due,
      allDay: true,
      clientId: clientId,
      projectId: task.projectId,
      taskId: task.id,
      status: task.status,
    );
  }

  /// Null when the content is not scheduled.
  static CalendarEntry? fromContent(ScheduledContent content) {
    final at = content.scheduledAt;
    if (at == null) return null;
    return CalendarEntry(
      key: 'content:${content.id}',
      sourceType: CalendarSourceTypes.content,
      title: content.title,
      start: at,
      clientId: content.clientId,
      contentId: content.id,
      status: content.status,
    );
  }

  /// Unique across sources.
  final String key;
  final String sourceType;
  final String title;
  final DateTime start;
  final DateTime? end;
  final bool allDay;
  final String? clientId;
  final String? projectId;

  /// Set for stored items, which are the only editable entries.
  final CalendarItem? item;
  final String? taskId;
  final String? contentId;

  /// Task or content status, when the entry mirrors one.
  final String? status;

  DateTime get firstDay => dayOf(start);

  /// Last calendar day the entry covers; an end at midnight belongs to the previous day.
  DateTime get lastDay {
    final to = end;
    if (to == null || !to.isAfter(start)) return firstDay;
    final local = to.toLocal();
    final atMidnight = local.hour == 0 && local.minute == 0 && local.second == 0;
    final last = dayOf(atMidnight ? local.subtract(const Duration(minutes: 1)) : local);
    return last.isBefore(firstDay) ? firstDay : last;
  }

  bool get spansDays => lastDay.isAfter(firstDay);
}

/// Local calendar day (midnight) of [value].
DateTime dayOf(DateTime value) {
  final local = value.toLocal();
  return DateTime(local.year, local.month, local.day);
}

DateTime addDays(DateTime day, int days) => DateTime(day.year, day.month, day.day + days);

/// First day of the month of [value].
DateTime monthOf(DateTime value) => DateTime(value.year, value.month);

DateTime addMonths(DateTime month, int months) => DateTime(month.year, month.month + months);

const daysPerWeek = 7;
const gridWeeks = 6;

/// Days shown for [month]: six full weeks starting on [firstWeekday]
/// (0 = Sunday … 6 = Saturday, as in `MaterialLocalizations.firstDayOfWeekIndex`).
List<DateTime> monthGrid(DateTime month, {int firstWeekday = 1}) {
  final first = monthOf(month);
  final offset = (first.weekday % daysPerWeek - firstWeekday) % daysPerWeek;
  final start = addDays(first, -offset);
  return [for (var i = 0; i < gridWeeks * daysPerWeek; i++) addDays(start, i)];
}

/// Longest span spread across days, so a bad end date cannot flood the grid.
const maxSpanDays = 62;

/// Entries per local day, each list ordered all-day first, then by start time and title.
/// Multi-day entries appear on every day they cover.
Map<DateTime, List<CalendarEntry>> entriesByDay(Iterable<CalendarEntry> entries) {
  final byDay = <DateTime, List<CalendarEntry>>{};
  for (final entry in entries) {
    final last = entry.lastDay;
    var day = entry.firstDay;
    for (var i = 0; i < maxSpanDays && !day.isAfter(last); i++) {
      (byDay[day] ??= []).add(entry);
      day = addDays(day, 1);
    }
  }
  for (final list in byDay.values) {
    list.sort(compareEntries);
  }
  return byDay;
}

int compareEntries(CalendarEntry a, CalendarEntry b) {
  if (a.allDay != b.allDay) return a.allDay ? -1 : 1;
  final byStart = a.start.compareTo(b.start);
  return byStart != 0 ? byStart : a.title.toLowerCase().compareTo(b.title.toLowerCase());
}

/// Days from today onwards that have entries, in order, with their entries.
List<(DateTime, List<CalendarEntry>)> upcomingDays(Map<DateTime, List<CalendarEntry>> byDay, {required DateTime now}) {
  final today = dayOf(now);
  final days = byDay.keys.where((day) => !day.isBefore(today)).toList()..sort();
  return [for (final day in days) (day, byDay[day] ?? const [])];
}

/// Calendar filters; null fields match everything.
class CalendarFilter {
  const CalendarFilter({this.clientId, this.sourceType});

  final String? clientId;
  final String? sourceType;

  bool get isActive => clientId != null || sourceType != null;

  bool matches(CalendarEntry entry) =>
      (clientId == null || entry.clientId == clientId) && (sourceType == null || entry.sourceType == sourceType);
}
