import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import 'position.dart';

class Department {
  const Department({
    required this.id,
    required this.name,
    this.parentId,
    this.path = '',
    this.depth = 0,
    this.positions = const [],
    this.createdAt,
  });

  /// Reads `GET departments`; `designations` are the positions defined in the department.
  factory Department.fromJson(Json json) => Department(
        id: json.str('id'),
        name: json.str('name'),
        parentId: json.strOrNull('parentId'),
        path: json.str('path'),
        depth: json.integer('depth'),
        positions: json.objects('designations').map(Position.fromJson).toList(),
        createdAt: json.date('createdAt'),
      );

  final String id;
  final String name;
  final String? parentId;

  /// Slash-separated ancestry (`Creative/Video`).
  final String path;
  final int depth;
  final List<Position> positions;
  final DateTime? createdAt;
}

/// A department with its sub-departments, for tree rendering.
class DepartmentNode {
  DepartmentNode(this.department, {required this.depth});

  final Department department;

  /// Depth in the built tree (0 for roots), independent of the stored `depth` column.
  final int depth;
  final List<DepartmentNode> children = [];

  bool get hasChildren => children.isNotEmpty;

  /// Positions in this department and every descendant.
  int get totalPositions => department.positions.length + children.fold(0, (sum, c) => sum + c.totalPositions);

  /// Number of departments beneath this one.
  int get descendantCount => children.fold(0, (sum, c) => sum + 1 + c.descendantCount);
}

/// Builds the forest from `parentId` links in O(n). Departments whose parent is missing become
/// roots, and any cycle is broken at the first revisited node so the tree is always finite.
List<DepartmentNode> buildDepartmentTree(List<Department> departments) {
  final byId = {for (final d in departments) d.id: d};
  final childrenOf = <String?, List<Department>>{};
  for (final department in departments) {
    final parent = department.parentId;
    final key = parent != null && parent != department.id && byId.containsKey(parent) ? parent : null;
    (childrenOf[key] ??= []).add(department);
  }
  for (final list in childrenOf.values) {
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  }

  final placed = <String>{};
  List<DepartmentNode> build(String? parentId, int depth) {
    final nodes = <DepartmentNode>[];
    for (final department in childrenOf[parentId] ?? const <Department>[]) {
      if (!placed.add(department.id)) continue;
      final node = DepartmentNode(department, depth: depth);
      node.children.addAll(build(department.id, depth + 1));
      nodes.add(node);
    }
    return nodes;
  }

  final roots = build(null, 0);
  // Departments only reachable through a cycle are surfaced as roots rather than dropped.
  for (final department in departments) {
    if (placed.contains(department.id)) continue;
    placed.add(department.id);
    final node = DepartmentNode(department, depth: 0);
    node.children.addAll(build(department.id, 1));
    roots.add(node);
  }
  return roots;
}

/// Depth-first rows to render: children of collapsed nodes are skipped.
List<DepartmentNode> visibleNodes(List<DepartmentNode> roots, Set<String> expanded) {
  final rows = <DepartmentNode>[];
  void walk(List<DepartmentNode> nodes) {
    for (final node in nodes) {
      rows.add(node);
      if (expanded.contains(node.department.id)) walk(node.children);
    }
  }

  walk(roots);
  return rows;
}

/// Rows whose name matches [query], plus their ancestors so matches keep their context.
List<DepartmentNode> matchingNodes(List<DepartmentNode> roots, String query) {
  final needle = query.trim().toLowerCase();
  final rows = <DepartmentNode>[];
  bool walk(DepartmentNode node) {
    final self = node.department.name.toLowerCase().contains(needle);
    final start = rows.length;
    var anyChild = false;
    for (final child in node.children) {
      anyChild = walk(child) || anyChild;
    }
    if (self || anyChild) rows.insert(start, node);
    return self || anyChild;
  }

  for (final root in roots) {
    walk(root);
  }
  return rows;
}

/// Every node in depth-first order, for pickers.
List<DepartmentNode> flattenTree(List<DepartmentNode> roots) =>
    visibleNodes(roots, {for (final node in _all(roots)) node.department.id});

Iterable<DepartmentNode> _all(List<DepartmentNode> nodes) sync* {
  for (final node in nodes) {
    yield node;
    yield* _all(node.children);
  }
}
