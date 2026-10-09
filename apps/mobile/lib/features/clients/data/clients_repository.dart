import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/client.dart';

class ClientsRepository {
  ClientsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('clients');

  Future<List<Client>> list() async => jsonList(await _api.get<Object?>(_base)).map(Client.fromJson).toList();

  Future<Client> get(String id) async => Client.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Client> create(ClientInput input, {required String workspaceId}) async => Client.fromJson(
        jsonObject(await _api.post<Object?>(_base, body: {...input.toJson(), 'workspaceId': workspaceId})),
      );

  Future<void> update(String id, ClientInput input) => _api.patch<Object?>('$_base/$id', body: input.toJson());

  Future<void> setStatus(String id, String status) => _api.patch<Object?>('$_base/$id', body: {'status': status});

  Future<void> updateBrandKit(String id, BrandKit kit) => _api.patch<Object?>('$_base/$id/brand-kit', body: kit.toJson());
}

final clientsRepositoryProvider = Provider<ClientsRepository>((ref) => ClientsRepository(ref.watch(apiClientProvider)));
