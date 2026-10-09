import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/automation.dart';

class AutomationsRepository {
  AutomationsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('automations');

  Future<List<Automation>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(Automation.fromJson).toList();

  Future<Automation> get(String id) async => Automation.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  /// Latest runs across every automation, newest first.
  Future<List<AutomationRun>> runs() async =>
      jsonList(await _api.get<Object?>('$_base/runs')).map(AutomationRun.fromJson).toList();

  Future<Automation> create(AutomationInput input) async =>
      Automation.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<void> update(String id, AutomationInput input) => _api.patch<Object?>('$_base/$id', body: input.toJson());

  Future<void> setEnabled(String id, {required bool enabled}) =>
      _api.patch<Object?>('$_base/$id', body: {'enabled': enabled});

  /// Archives the automation; its run history is kept.
  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');

  /// Publishes the current trigger/action as a new version and activates it. Returns the version number.
  Future<int> publish(String id) async =>
      jsonObject(await _api.post<Object?>('$_base/$id/publish', body: const <String, Object?>{})).integer('version');

  Future<void> run(String id, {String? detail}) =>
      _api.post<Object?>('$_base/$id/run', body: {'detail': ?detail});
}

final automationsRepositoryProvider =
    Provider<AutomationsRepository>((ref) => AutomationsRepository(ref.watch(apiClientProvider)));
