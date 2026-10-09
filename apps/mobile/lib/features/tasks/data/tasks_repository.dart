import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/task.dart';

class TasksRepository {
  TasksRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('tasks');

  Future<List<Task>> list({String? projectId}) async =>
      jsonList(await _api.get<Object?>(_base, query: {'projectId': projectId})).map(Task.fromJson).toList();

  Future<Task> get(String id) async => Task.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Task> create(TaskInput input) async =>
      Task.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<Task> update(String id, TaskPatch patch) async =>
      Task.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: patch.toJson())));

  Future<Task> transition(String id, String toStatus) async => Task.fromJson(
        jsonObject(await _api.post<Object?>('$_base/$id/transition', body: {'toStatus': toStatus})),
      );

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');
}

final tasksRepositoryProvider = Provider<TasksRepository>((ref) => TasksRepository(ref.watch(apiClientProvider)));
