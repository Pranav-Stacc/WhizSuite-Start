import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/calendar/domain/calendar_entry.dart';
import 'package:agency_os/features/calendar/domain/calendar_item.dart';
import 'package:flutter_test/flutter_test.dart';

CalendarEntry _entry({
  required DateTime start,
  DateTime? end,
  bool allDay = false,
  String title = 'Event',
  String source = CalendarSourceTypes.manual,
}) =>
    CalendarEntry(
      key: 'item:$title',
      sourceType: source,
      title: title,
      start: start,
      end: end,
      allDay: allDay,
    );

void main() {
  group('day helpers', () {
    test('dayOf strips time in local calendar', () {
      final value = DateTime(2026, 10, 9, 15, 30);
      expect(dayOf(value), DateTime(2026, 10, 9));
    });

    test('monthGrid starts on the configured first weekday', () {
      final days = monthGrid(DateTime(2026, 10), firstWeekday: 1);
      expect(days, hasLength(gridWeeks * daysPerWeek));
      expect(days.first.weekday % daysPerWeek, 1);
      expect(days.any((d) => d.year == 2026 && d.month == 10 && d.day == 1), isTrue);
    });
  });

  group('CalendarEntry span', () {
    test('single-day timed entry covers one day', () {
      final entry = _entry(start: DateTime(2026, 10, 9, 9), end: DateTime(2026, 10, 9, 10));
      expect(entry.firstDay, DateTime(2026, 10, 9));
      expect(entry.lastDay, DateTime(2026, 10, 9));
      expect(entry.spansDays, isFalse);
    });

    test('end at midnight belongs to the previous day', () {
      final entry = _entry(start: DateTime(2026, 10, 9, 9), end: DateTime(2026, 10, 11));
      expect(entry.lastDay, DateTime(2026, 10, 10));
      expect(entry.spansDays, isTrue);
    });
  });

  group('entriesByDay', () {
    test('places multi-day entries on every covered day and sorts all-day first', () {
      final timed = _entry(start: DateTime(2026, 10, 9, 14), title: 'Call');
      final allDay = _entry(
        start: DateTime(2026, 10, 9),
        end: DateTime(2026, 10, 10, 23, 59),
        allDay: true,
        title: 'Offsite',
      );
      final byDay = entriesByDay([timed, allDay]);
      expect(byDay[DateTime(2026, 10, 9)]!.map((e) => e.title), ['Offsite', 'Call']);
      expect(byDay[DateTime(2026, 10, 10)]!.single.title, 'Offsite');
    });
  });

  group('upcomingDays', () {
    test('omits days before today', () {
      final byDay = entriesByDay([
        _entry(start: DateTime(2026, 10, 8, 9), title: 'Past'),
        _entry(start: DateTime(2026, 10, 9, 9), title: 'Today'),
        _entry(start: DateTime(2026, 10, 10, 9), title: 'Tomorrow'),
      ]);
      final upcoming = upcomingDays(byDay, now: DateTime(2026, 10, 9, 12));
      expect(upcoming.map((pair) => pair.$1), [DateTime(2026, 10, 9), DateTime(2026, 10, 10)]);
    });
  });

  group('CalendarFilter', () {
    test('matches client and source independently', () {
      final entry = CalendarEntry(
        key: 'item:1',
        sourceType: CalendarSourceTypes.meeting,
        title: 'Sync',
        start: DateTime(2026, 10, 9, 9),
        clientId: 'c1',
      );
      expect(const CalendarFilter(clientId: 'c1').matches(entry), isTrue);
      expect(const CalendarFilter(clientId: 'c2').matches(entry), isFalse);
      expect(const CalendarFilter(sourceType: CalendarSourceTypes.meeting).matches(entry), isTrue);
      expect(const CalendarFilter(sourceType: CalendarSourceTypes.task).matches(entry), isFalse);
    });
  });

  group('CalendarItemInput', () {
    test('create payload stores visibility and project in metadata', () {
      final json = CalendarItemInput(
        title: 'Kickoff',
        sourceType: CalendarSourceTypes.meeting,
        startsAt: DateTime.utc(2026, 10, 9, 9),
        endsAt: DateTime.utc(2026, 10, 9, 10),
        allDay: false,
        visibility: Visibilities.clientVisible,
        clientId: 'c1',
        projectId: 'p1',
      ).toCreateJson(newId: () => 'fallback');

      expect(json['sourceType'], CalendarSourceTypes.meeting);
      expect(json['sourceId'], 'p1');
      expect(json['clientId'], 'c1');
      expect(json['metadata'], {
        CalendarItem.visibilityKey: Visibilities.clientVisible,
        CalendarItem.projectKey: 'p1',
      });
    });
  });
}
