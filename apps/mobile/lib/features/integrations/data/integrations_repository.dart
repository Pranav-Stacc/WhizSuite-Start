import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/integration_connection.dart';
import '../domain/platform_channel.dart';

class IntegrationsRepository {
  IntegrationsRepository(this._api);

  final ApiClient _api;

  String get _connections => _api.org('integrations/connections');
  String get _meta => _api.org('integrations/meta');

  Future<List<IntegrationConnection>> listConnections() async =>
      jsonList(await _api.get<Object?>(_connections)).map(IntegrationConnection.fromJson).toList();

  Future<List<PlatformChannel>> listSocialAccounts({String? clientId}) async {
    final query = clientId == null ? null : {'clientId': clientId};
    final rows = jsonList(await _api.get<Object?>(_api.org('social-accounts'), query: query));
    return rows.map((row) => PlatformChannel.fromSocialAccount(row)).toList();
  }

  Future<String> beginMetaConnect({
    required String clientId,
    required String platform,
  }) async {
    final body = await _api.post<Object?>(
      '$_meta/connect',
      body: {
        'clientId': clientId,
        'platform': platform,
        'returnTo': 'mobile',
      },
    );
    return jsonObject(body).str('authorizeUrl');
  }

  Future<void> disconnectMeta(String socialAccountId) => _api.post<Object?>(
        '$_meta/disconnect',
        body: {'socialAccountId': socialAccountId},
      );

  Future<IntegrationConnection> create(ConnectionInput input) async =>
      IntegrationConnection.fromJson(jsonObject(await _api.post<Object?>(_connections, body: input.toCreateJson())));

  Future<void> update(String id, ConnectionInput input) =>
      _api.patch<Object?>('$_connections/$id', body: input.toUpdateJson());

  Future<void> setStatus(String id, String status) =>
      _api.patch<Object?>('$_connections/$id', body: {'status': status});
}

final integrationsRepositoryProvider =
    Provider<IntegrationsRepository>((ref) => IntegrationsRepository(ref.watch(apiClientProvider)));
