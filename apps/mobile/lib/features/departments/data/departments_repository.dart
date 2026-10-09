import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/department.dart';

class DepartmentsRepository {
  DepartmentsRepository(this._api);

  final ApiClient _api;

  Future<List<Department>> list() async =>
      jsonList(await _api.get<Object?>(_api.org('departments'))).map(Department.fromJson).toList();

  Future<void> create({required String name, String? parentId}) =>
      _api.post<Object?>(_api.org('departments'), body: {'name': name, 'parentId': ?parentId});

  Future<void> createTeam({required String name, String? description}) =>
      _api.post<Object?>(_api.org('teams'), body: {'name': name, 'description': ?description});
}

final departmentsRepositoryProvider = Provider<DepartmentsRepository>(
  (ref) => DepartmentsRepository(ref.watch(apiClientProvider)),
);
