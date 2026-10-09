import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

const _keySeparator = '.';

/// One grantable permission from `GET v1/permissions`.
class PermissionDef {
  const PermissionDef({required this.key, required this.group});

  /// Falls back to the key's domain prefix when the catalog row has no category.
  factory PermissionDef.fromJson(Json json) {
    final key = json.str('key');
    return PermissionDef(key: key, group: json.strOrNull('category') ?? groupOf(key));
  }

  /// `content.view` → domain prefix `content`.
  static String groupOf(String key) {
    final index = key.indexOf(_keySeparator);
    return index < 0 ? key : key.substring(0, index);
  }

  /// `org.settings.manage` → `settings.manage`.
  static String actionOf(String key) {
    final index = key.indexOf(_keySeparator);
    return index < 0 ? key : key.substring(index + 1);
  }

  final String key;
  final String group;

  String get action => actionOf(key);
}

/// Permissions of one domain, in catalog order.
class PermissionGroup {
  const PermissionGroup({required this.key, required this.permissions});

  final String key;
  final List<PermissionDef> permissions;

  Iterable<String> get keys => permissions.map((p) => p.key);

  GroupSelection selectionIn(Set<String> selected) {
    final count = keys.where(selected.contains).length;
    if (count == 0) return GroupSelection.none;
    return count == permissions.length ? GroupSelection.all : GroupSelection.partial;
  }

  int selectedCount(Set<String> selected) => keys.where(selected.contains).length;
}

/// Tri-state of a group toggle.
enum GroupSelection { none, partial, all }

/// Groups the catalog by domain, keeping first-seen group order and dropping duplicate keys.
List<PermissionGroup> groupPermissions(Iterable<PermissionDef> catalog) {
  final groups = <String, List<PermissionDef>>{};
  final seen = <String>{};
  for (final permission in catalog) {
    if (permission.key.isEmpty || !seen.add(permission.key)) continue;
    (groups[permission.group] ??= []).add(permission);
  }
  return [for (final entry in groups.entries) PermissionGroup(key: entry.key, permissions: entry.value)];
}

/// Keeps groups and permissions whose key or human label contains [query] (lowercased).
List<PermissionGroup> filterGroups(
  List<PermissionGroup> groups,
  String query,
  String Function(PermissionDef permission) labelOf,
  String Function(String group) groupLabelOf,
) {
  final needle = query.trim().toLowerCase();
  if (needle.isEmpty) return groups;
  final result = <PermissionGroup>[];
  for (final group in groups) {
    if (groupLabelOf(group.key).toLowerCase().contains(needle)) {
      result.add(group);
      continue;
    }
    final matches = group.permissions
        .where((p) => p.key.toLowerCase().contains(needle) || labelOf(p).toLowerCase().contains(needle))
        .toList();
    if (matches.isNotEmpty) result.add(PermissionGroup(key: group.key, permissions: matches));
  }
  return result;
}

/// Reads the catalog payload.
List<PermissionDef> permissionsFromJson(Object? raw) =>
    jsonList(raw).map(PermissionDef.fromJson).where((p) => p.key.isNotEmpty).toList();
