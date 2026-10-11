import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../access/application/access_controller.dart';
import '../data/directory_repository.dart';
import '../domain/directory_entry.dart';

/// Loads a directory only when the member may list it; otherwise names fall back gracefully.
Future<Directory> _load(Ref ref, String permission, Future<List<DirectoryEntry>> Function(DirectoryRepository) read) async {
  final allowed = ref.watch(accessPolicyProvider.select((policy) => policy.can(permission)));
  if (!allowed) return Directory.empty;
  return Directory(await read(ref.watch(directoryRepositoryProvider)));
}

final clientDirectoryProvider = FutureProvider<Directory>(
  (ref) => _load(ref, Permissions.clientsView, (repo) => repo.clients()),
);

final projectDirectoryProvider = FutureProvider<Directory>(
  (ref) => _load(ref, Permissions.projectsView, (repo) => repo.projects()),
);

final teamDirectoryProvider = FutureProvider<Directory>(
  (ref) => _load(ref, Permissions.orgView, (repo) => repo.teams()),
);

/// Members keyed by user id; `parentId` carries the membership type.
final memberDirectoryProvider = FutureProvider<Directory>(
  (ref) => _load(ref, Permissions.membersView, (repo) => repo.members()),
);

/// The organization's workspaces; clients and projects are created in the first one.
final workspaceDirectoryProvider = FutureProvider<Directory>(
  (ref) => _load(ref, Permissions.workspacesView, (repo) => repo.workspaces()),
);

/// Staff members only (assignable to work).
final staffDirectoryProvider = FutureProvider<Directory>((ref) async {
  final members = await ref.watch(memberDirectoryProvider.future);
  return Directory(members.entries.where((m) => m.parentId != MembershipTypes.client).toList());
});
