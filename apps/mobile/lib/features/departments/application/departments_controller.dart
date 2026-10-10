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

  Future<void> update(String id, {String? name, String? parentId, bool clearParent = false}) async {
    await _repo.update(id, name: name, parentId: parentId, clearParent: clearParent);
    _ref.invalidate(departmentsProvider);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _ref.invalidate(departmentsProvider);
  }

  Future<void> createPosition(String departmentId, {required String name, bool isHead = false}) async {
    await _repo.createPosition(departmentId, name: name, isHead: isHead);
    _ref.invalidate(departmentsProvider);
  }

  Future<void> updatePosition(String id, {String? name, bool? isHead}) async {
    await _repo.updatePosition(id, name: name, isHead: isHead);
    _ref.invalidate(departmentsProvider);
  }

  Future<void> deletePosition(String id) async {
    await _repo.deletePosition(id);
    _ref.invalidate(departmentsProvider);
  }

  /// Teams have no list endpoint yet, so nothing on screen needs refreshing.
  Future<void> createTeam({required String name, String? description}) =>
      _repo.createTeam(name: name, description: description);
}

final departmentsActionsProvider = Provider<DepartmentsActions>(DepartmentsActions.new);
