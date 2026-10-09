import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/lead.dart';

class LeadsRepository {
  LeadsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('leads');

  Future<List<Lead>> list() async => jsonList(await _api.get<Object?>(_base)).map(Lead.fromJson).toList();

  Future<Lead> get(String id) async => Lead.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Lead> create(LeadInput input) async =>
      Lead.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<Lead> update(String id, LeadInput input) => _patch(id, input.toJson());

  Future<Lead> setStage(String id, String stage) => _patch(id, {'stage': stage});

  Future<Lead> setNextStep(String id, String? step, DateTime? at) => _patch(id, nextStepJson(step, at));

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');

  Future<Lead> _patch(String id, Json body) async =>
      Lead.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: body)));
}

final leadsRepositoryProvider = Provider<LeadsRepository>((ref) => LeadsRepository(ref.watch(apiClientProvider)));
