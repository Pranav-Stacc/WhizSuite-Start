import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/departments_repository.dart';
import '../domain/department.dart';

final departmentsProvider = FutureProvider.autoDispose<List<Department>>(
  (ref) => ref.watch(departmentsRepositoryProvider).list(),
);

/// The organisation chart as a forest of departments.
final departmentTreeProvider = FutureProvider.autoDispose<List<DepartmentNode>>(
  (ref) async => buildDepartmentTree(await ref.watch(departmentsProvider.future)),
);

class DepartmentsActions {
  DepartmentsActions(this._ref);

  final Ref _ref;

  DepartmentsRepository get _repo => _ref.read(departmentsRepositoryProvider);

  Future<void> create({required String name, String? parentId}) async {
    await _repo.create(name: name, parentId: parentId);
    _ref.invalidate(departmentsProvider);
  }

  /// Teams have no list endpoint yet, so nothing on screen needs refreshing.
  Future<void> createTeam({required String name, String? description}) =>
      _repo.createTeam(name: name, description: description);
}

final departmentsActionsProvider = Provider<DepartmentsActions>(DepartmentsActions.new);
