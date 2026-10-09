import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/time_entry.dart';

class TimeRepository {
  TimeRepository(this._api);

  final ApiClient _api;

  String get _entries => _api.org('time/entries');
  String get _timer => _api.org('time/timer');

  Future<List<TimeEntry>> entries() async =>
      jsonList(await _api.get<Object?>(_entries)).map(TimeEntry.fromJson).toList();

  Future<TimeEntry> log(TimeEntryInput input) async =>
      TimeEntry.fromJson(jsonObject(await _api.post<Object?>(_entries, body: input.toJson())));

  Future<void> delete(String id) => _api.delete<Object?>('$_entries/$id');

  /// The caller's running timer; the API answers with an empty body when none is running.
  Future<RunningTimer?> runningTimer() async {
    final raw = await _api.get<Object?>(_timer);
    return raw is Map ? RunningTimer.fromJson(jsonObject(raw)) : null;
  }

  Future<RunningTimer> startTimer(String taskId) async =>
      RunningTimer.fromJson(jsonObject(await _api.post<Object?>('$_timer/start', body: {'taskId': taskId})));

  Future<TimeEntry> stopTimer() async => TimeEntry.fromJson(jsonObject(await _api.post<Object?>('$_timer/stop')));

  /// Tasks the timer and log form can reference.
  Future<List<TaskOption>> tasks() async =>
      jsonList(await _api.get<Object?>(_api.org('tasks'))).map(TaskOption.fromJson).toList();
}

final timeRepositoryProvider = Provider<TimeRepository>((ref) => TimeRepository(ref.watch(apiClientProvider)));
