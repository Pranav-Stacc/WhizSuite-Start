import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/preferences.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../data/workspaces_repository.dart';
import '../tenancy_ui.dart';

String _activeWorkspaceKey(String organizationId) => 'workspace.active.$organizationId';

/// Workspaces the member may list (same source as [workspaceDirectoryProvider]).
final workspacesProvider = FutureProvider.autoDispose<List<DirectoryEntry>>(
  (ref) => ref.watch(workspacesRepositoryProvider).list(),
);

/// Active workspace for creates and defaults; persisted per organization.
final activeWorkspaceIdProvider = FutureProvider<String?>((ref) async {
  final workspaces = await ref.watch(workspacesProvider.future);
  if (workspaces.isEmpty) return null;
  final session = ref.watch(sessionProvider).value;
  if (tenancyWorkspaceUiEnabled && session != null) {
    final stored = ref.watch(sharedPreferencesProvider).getString(_activeWorkspaceKey(session.organizationId));
    if (stored != null && workspaces.any((entry) => entry.id == stored)) return stored;
  }
  return workspaces.first.id;
});

/// Resolved active workspace entry, when one is selected.
final activeWorkspaceProvider = FutureProvider<DirectoryEntry?>((ref) async {
  final id = await ref.watch(activeWorkspaceIdProvider.future);
  if (id == null) return null;
  final workspaces = await ref.watch(workspacesProvider.future);
  for (final entry in workspaces) {
    if (entry.id == id) return entry;
  }
  return null;
});

/// Alias kept for client/project create paths.
final defaultWorkspaceIdProvider = activeWorkspaceIdProvider;

/// Switch workspace or create a new one; invalidates dependent lists.
class WorkspaceActions {
  WorkspaceActions(this._ref);

  final Ref _ref;

  Future<void> select(String workspaceId) async {
    final session = _ref.read(sessionProvider).value;
    if (session == null) return;
    await _ref.read(sharedPreferencesProvider).setString(_activeWorkspaceKey(session.organizationId), workspaceId);
    _ref.invalidate(activeWorkspaceIdProvider);
    _ref.invalidate(activeWorkspaceProvider);
  }

  Future<DirectoryEntry> create({required String name, required String slug}) async {
    final workspace = await _ref.read(workspacesRepositoryProvider).create(name: name, slug: slug);
    _ref
      ..invalidate(workspacesProvider)
      ..invalidate(workspaceDirectoryProvider);
    await select(workspace.id);
    return workspace;
  }
}

final workspaceActionsProvider = Provider<WorkspaceActions>(WorkspaceActions.new);
