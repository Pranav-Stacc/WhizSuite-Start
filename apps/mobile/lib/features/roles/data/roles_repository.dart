import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/permission_catalog.dart';
import '../domain/role.dart';

class RolesRepository {
  RolesRepository(this._api);

  static const _catalogPath = 'v1/permissions';

  final ApiClient _api;

  String get _base => _api.org('roles');

  Future<List<Role>> list() async => jsonList(await _api.get<Object?>(_base)).map(Role.fromJson).toList();

  Future<List<PermissionDef>> permissions() async => permissionsFromJson(await _api.get<Object?>(_catalogPath));

  Future<Role> create(RoleInput input) async =>
      Role.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  Future<void> update(String id, RoleInput input) => _api.patch<Object?>('$_base/$id', body: input.toJson());

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');
}

final rolesRepositoryProvider = Provider<RolesRepository>((ref) => RolesRepository(ref.watch(apiClientProvider)));
