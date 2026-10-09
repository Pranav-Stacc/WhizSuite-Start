import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/directory_entry.dart';

/// Reads id → name references for clients, projects and members.
class DirectoryRepository {
  DirectoryRepository(this._api);

  final ApiClient _api;

  Future<List<DirectoryEntry>> clients() async {
    final raw = await _api.get<Object?>(_api.org('clients'));
    return [
      for (final json in jsonList(raw))
        DirectoryEntry(id: json.str('id'), name: json.strOrNull('displayName') ?? json.str('name')),
    ];
  }

  Future<List<DirectoryEntry>> projects() async {
    final raw = await _api.get<Object?>(_api.org('projects'));
    return [
      for (final json in jsonList(raw))
        DirectoryEntry(id: json.str('id'), name: json.str('name'), parentId: json.strOrNull('clientId')),
    ];
  }

  Future<List<DirectoryEntry>> workspaces() async {
    final raw = await _api.get<Object?>(_api.org('workspaces'));
    return [for (final json in jsonList(raw)) DirectoryEntry(id: json.str('id'), name: json.str('name'))];
  }

  Future<List<DirectoryEntry>> members() async {
    final raw = await _api.get<Object?>(_api.org('members'));
    return [
      for (final json in jsonList(raw))
        DirectoryEntry(
          id: json.str('id'),
          name: json.strOrNull('name') ?? json.str('email'),
          detail: json.strOrNull('email'),
          parentId: json.strOrNull('membershipType'),
        ),
    ];
  }
}

final directoryRepositoryProvider = Provider<DirectoryRepository>(
  (ref) => DirectoryRepository(ref.watch(apiClientProvider)),
);
