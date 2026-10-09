import 'time_entry.dart';

const int minutesPerHour = 60;

/// Monday at local midnight of the week containing [day].
DateTime weekStartOf(DateTime day) {
  final date = DateTime(day.year, day.month, day.day);
  return DateTime(date.year, date.month, date.day - (date.weekday - DateTime.monday));
}

/// The seven calendar days starting at [start].
List<DateTime> weekDays(DateTime start) => [
  for (var i = 0; i < DateTime.daysPerWeek; i++) DateTime(start.year, start.month, start.day + i),
];

/// Whether [entry] falls within the week starting at [start].
bool inWeek(TimeEntry entry, DateTime start) {
  final end = DateTime(start.year, start.month, start.day + DateTime.daysPerWeek);
  final day = entry.day;
  return !day.isBefore(start) && day.isBefore(end);
}

/// Entries of one calendar day, newest first, with their total.
class DayGroup {
  const DayGroup({required this.day, required this.entries});

  final DateTime day;
  final List<TimeEntry> entries;

  int get minutes => entries.fold(0, (sum, e) => sum + e.minutes);
}

/// Groups entries by local day, newest day first; each day's entries newest first.
List<DayGroup> groupByDay(Iterable<TimeEntry> entries) {
  final byDay = <DateTime, List<TimeEntry>>{};
  for (final entry in entries) {
    byDay.putIfAbsent(entry.day, () => []).add(entry);
  }
  return [
    for (final MapEntry(key: day, value: dayEntries) in byDay.entries)
      DayGroup(day: day, entries: dayEntries..sort((a, b) => b.startedAt.compareTo(a.startedAt))),
  ]..sort((a, b) => b.day.compareTo(a.day));
}

/// Whole calendar days from [from] to [to], immune to daylight-saving shifts.
int calendarDaysBetween(DateTime from, DateTime to) =>
    DateTime.utc(to.year, to.month, to.day).difference(DateTime.utc(from.year, from.month, from.day)).inDays;

/// Minutes per weekday plus totals for a week of entries.
class WeekSummary {
  const WeekSummary({required this.start, required this.minutesPerDay, required this.billableMinutes});

  factory WeekSummary.of(Iterable<TimeEntry> entries, DateTime start) {
    final perDay = List.filled(DateTime.daysPerWeek, 0);
    var billable = 0;
    for (final entry in entries) {
      if (!inWeek(entry, start)) continue;
      final index = calendarDaysBetween(start, entry.day);
      perDay[index] += entry.minutes;
      if (entry.billable) billable += entry.minutes;
    }
    return WeekSummary(start: start, minutesPerDay: perDay, billableMinutes: billable);
  }

  final DateTime start;

  /// Monday first.
  final List<int> minutesPerDay;
  final int billableMinutes;

  int get totalMinutes => minutesPerDay.fold(0, (a, b) => a + b);

  /// Share of tracked time that is billable, 0..1; 0 for an empty week.
  double get billableRatio => totalMinutes == 0 ? 0 : billableMinutes / totalMinutes;

  List<double> get hoursPerDay => [for (final m in minutesPerDay) m / minutesPerHour];
}
