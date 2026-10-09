import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

const _dateKeyLength = 10;

/// Reads a date-only API field (`2026-10-24` or `2026-10-24T00:00:00.000Z`) as that calendar
/// day at local midnight, so it never shifts a day in timezones behind UTC.
DateTime? calendarDate(Json json, String key) {
  final raw = json.str(key);
  if (raw.length < _dateKeyLength) return null;
  return DateTime.tryParse(raw.substring(0, _dateKeyLength));
}
