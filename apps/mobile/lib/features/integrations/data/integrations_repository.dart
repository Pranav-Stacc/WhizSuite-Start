import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/integration_connection.dart';

class IntegrationsRepository {
  IntegrationsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('integrations/connections');

  Future<List<IntegrationConnection>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(IntegrationConnection.fromJson).toList();

  /// New connections start as pending until the provider confirms them.
  Future<IntegrationConnection> create(ConnectionInput input) async =>
      IntegrationConnection.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toCreateJson())));

  Future<void> update(String id, ConnectionInput input) => _api.patch<Object?>('$_base/$id', body: input.toUpdateJson());

  Future<void> setStatus(String id, String status) => _api.patch<Object?>('$_base/$id', body: {'status': status});
}

final integrationsRepositoryProvider =
    Provider<IntegrationsRepository>((ref) => IntegrationsRepository(ref.watch(apiClientProvider)));
