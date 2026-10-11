import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/calendar_entry.dart';
import '../domain/calendar_item.dart';
import '../domain/google_calendar_connection.dart';
import '../domain/google_calendar_sync_types.dart';

class CalendarRepository {
  CalendarRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('calendar/items');
  String get _feed => _api.org('calendar/feed');
  String get _shoots => _api.org('calendar/shoots');
  String get _google => _api.org('calendar/google');

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

  /// Plans a shoot day (`POST calendar/shoots`, needs `projects.create`).
  Future<CalendarItem> createShoot(CreateShootInput input) async =>
      CalendarItem.fromJson(jsonObject(await _api.post<Object?>(_shoots, body: input.toJson())));

  Future<GoogleCalendarConnection> googleConnection() async {
    try {
      return GoogleCalendarConnection.fromJson(jsonObject(await _api.get<Object?>(_google)));
    } catch (_) {
      return GoogleCalendarConnection.disabled;
    }
  }

  Future<String> beginGoogleCalendarConnect({bool mobileReturn = true}) async => jsonObject(
        await _api.post<Object?>(
          '$_google/connect',
          body: mobileReturn ? {'returnTo': 'mobile'} : null,
        ),
      ).str('authorizeUrl');

  Future<void> disconnectGoogleCalendar(String connectionId) =>
      _api.post<Object?>('$_google/$connectionId/disconnect');

  Future<GoogleCalendarConnection> updateGoogleCalendarSettings({
    bool? defaultSyncNewEvents,
    String? syncDirection,
    GoogleCalendarSyncTypes? syncTypes,
  }) async {
    final body = <String, Object?>{};
    if (defaultSyncNewEvents != null) body['defaultSyncNewEvents'] = defaultSyncNewEvents;
    if (syncDirection != null) body['syncDirection'] = syncDirection;
    if (syncTypes != null) body['syncTypes'] = syncTypes.toJson();
    return GoogleCalendarConnection.fromJson(
      jsonObject(await _api.patch<Object?>('$_google/settings', body: body)),
    );
  }

  Future<void> pullGoogleCalendar({required DateTime from, required DateTime to}) => _api.post<Object?>(
        '$_google/pull',
        body: {
          'from': from.toUtc().toIso8601String(),
          'to': to.toUtc().toIso8601String(),
        },
      );
}

/// Body for `POST …/calendar/shoots` (matches createShootSchema).
class CreateShootInput {
  const CreateShootInput({
    required this.title,
    required this.startsAt,
    required this.clientId,
    this.endsAt,
    this.allDay = true,
    this.projectId,
    this.createFolders = true,
    this.taskTitles = const [],
    this.syncToGoogle = false,
  });

  final String title;
  final DateTime startsAt;
  final DateTime? endsAt;
  final bool allDay;
  final String clientId;
  final String? projectId;
  final bool createFolders;
  final List<String> taskTitles;
  final bool syncToGoogle;

  Json toJson() => {
        'title': title,
        'startsAt': startsAt.toUtc().toIso8601String(),
        if (endsAt != null) 'endsAt': endsAt!.toUtc().toIso8601String(),
        'allDay': allDay,
        'clientId': clientId,
        if (projectId != null && projectId!.isNotEmpty) 'projectId': projectId,
        'createFolders': createFolders,
        'taskTitles': taskTitles,
        'syncToGoogle': syncToGoogle,
      };
}

final calendarRepositoryProvider = Provider<CalendarRepository>(
  (ref) => CalendarRepository(ref.watch(apiClientProvider)),
);
