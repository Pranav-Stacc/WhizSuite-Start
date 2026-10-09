/// Lightweight reference to another domain's entity, used for pickers and name lookups.
class DirectoryEntry {
  const DirectoryEntry({required this.id, required this.name, this.parentId, this.detail});

  final String id;
  final String name;

  /// Owning entity (e.g. a project's client).
  final String? parentId;

  /// Secondary text (e.g. a member's email).
  final String? detail;
}

/// Id-indexed set of entries with name resolution.
class Directory {
  Directory(this.entries) : _byId = {for (final entry in entries) entry.id: entry};

  static final empty = Directory(const []);

  final List<DirectoryEntry> entries;
  final Map<String, DirectoryEntry> _byId;

  DirectoryEntry? operator [](String? id) => id == null ? null : _byId[id];

  String? nameOf(String? id) => this[id]?.name;

  List<DirectoryEntry> childrenOf(String? parentId) =>
      parentId == null ? entries : entries.where((e) => e.parentId == parentId).toList();
}
