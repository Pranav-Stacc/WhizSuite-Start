import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/calendar_entry.dart';
import '../domain/calendar_item.dart';

class CalendarRepository {
  CalendarRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('calendar/items');
  String get _feed => _api.org('calendar/feed');

  Future<List<CalendarItem>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(CalendarItem.fromJson).toList();

  /// Unified scoped feed (stored items + content, tasks, approvals, …).
  Future<List<CalendarItem>> feed({DateTime? from, DateTime? to, String? clientId}) async {
    final params = <String, String>{};
    if (from != null) params['from'] = from.toUtc().toIso8601String();
    if (to != null) params['to'] = to.toUtc().toIso8601String();
    if (clientId != null && clientId.isNotEmpty) params['clientId'] = clientId;
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((e) => '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}').join('&')}';
    return jsonList(await _api.get<Object?>('$_feed$query')).map(CalendarItem.fromFeedJson).toList();
  }

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
