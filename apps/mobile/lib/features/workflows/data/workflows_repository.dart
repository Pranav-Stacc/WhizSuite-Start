import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/workflow.dart';

class WorkflowsRepository {
  WorkflowsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('workflows');

  Future<List<Workflow>> list() async => jsonList(await _api.get<Object?>(_base)).map(Workflow.fromJson).toList();

  Future<Workflow> get(String id) async => Workflow.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Workflow> create(WorkflowInput input) async =>
      Workflow.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson(clearEmpty: false))));

  /// Changing the stages creates a new version; other settings update in place.
  Future<void> update(String id, WorkflowInput input) =>
      _api.patch<Object?>('$_base/$id', body: input.toJson(clearEmpty: true));

  Future<void> setActive(String id, {required bool active}) =>
      _api.patch<Object?>('$_base/$id', body: {'active': active});

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');

  Future<WorkflowVersion> version(String versionId) async =>
      WorkflowVersion.fromJson(jsonObject(await _api.get<Object?>('$_base/versions/$versionId')));

  Future<void> publishVersion(String versionId) => _api.post<Object?>('$_base/versions/$versionId/publish');

  /// Whether a version allows moving directly from one state key to another.
  Future<bool> canTransition(String versionId, {required String fromKey, required String toKey}) async => jsonObject(
        await _api.post<Object?>(
          '$_base/versions/$versionId/can-transition',
          body: {'fromState': fromKey, 'toState': toKey},
        ),
      ).flag('allowed');
}

final workflowsRepositoryProvider =
    Provider<WorkflowsRepository>((ref) => WorkflowsRepository(ref.watch(apiClientProvider)));
