import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/calendar_entry.dart';
import '../domain/calendar_item.dart';

class CalendarRepository {
  CalendarRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('calendar/items');

  Future<List<CalendarItem>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(CalendarItem.fromJson).toList();

  Future<CalendarItem> create(CalendarItemInput input) async =>
      CalendarItem.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toCreateJson())));

  Future<CalendarItem> update(CalendarItem item, CalendarItemInput input) async => CalendarItem.fromJson(
        jsonObject(await _api.patch<Object?>('$_base/${item.id}', body: input.toUpdateJson(item))),
      );

  /// Content with a schedule (`GET content`, needs `content.view`).
  Future<List<ScheduledContent>> scheduledContent() async => [
        for (final json in jsonList(await _api.get<Object?>(_api.org('content'))))
          if (json.date('scheduledAt') != null) ScheduledContent.fromJson(json),
      ];
}

final calendarRepositoryProvider = Provider<CalendarRepository>(
  (ref) => CalendarRepository(ref.watch(apiClientProvider)),
);
