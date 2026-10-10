import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/department.dart';
import '../domain/position.dart';

class DepartmentsRepository {
  DepartmentsRepository(this._api);

  final ApiClient _api;

  String get _departments => _api.org('departments');
  String _designation(String id) => _api.org('designations/$id');

  Future<List<Department>> list() async =>
      jsonList(await _api.get<Object?>(_departments)).map(Department.fromJson).toList();

  Future<void> create({required String name, String? parentId}) =>
      _api.post<Object?>(_departments, body: {'name': name, 'parentId': ?parentId});

  Future<void> update(String id, {String? name, String? parentId, bool clearParent = false}) {
    final body = <String, Object?>{};
    if (name != null) body['name'] = name;
    if (clearParent) {
      body['parentId'] = null;
    } else if (parentId != null) {
      body['parentId'] = parentId;
    }
    return _api.patch<Object?>('$_departments/$id', body: body);
  }

  Future<void> delete(String id) => _api.delete<Object?>('$_departments/$id');

  Future<Position> createPosition(String departmentId, {required String name, bool isHead = false}) async =>
      Position.fromJson(
        jsonObject(
          await _api.post<Object?>('$_departments/$departmentId/designations', body: {'name': name, 'isHead': isHead}),
        ),
      );

  Future<Position> updatePosition(String id, {String? name, bool? isHead}) async {
    final body = <String, Object?>{};
    if (name != null) body['name'] = name;
    if (isHead != null) body['isHead'] = isHead;
    return Position.fromJson(jsonObject(await _api.patch<Object?>(_designation(id), body: body)));
  }

  Future<void> deletePosition(String id) => _api.delete<Object?>(_designation(id));

  Future<void> createTeam({required String name, String? description}) =>
      _api.post<Object?>(_api.org('teams'), body: {'name': name, 'description': ?description});
}

final departmentsRepositoryProvider = Provider<DepartmentsRepository>(
  (ref) => DepartmentsRepository(ref.watch(apiClientProvider)),
);
