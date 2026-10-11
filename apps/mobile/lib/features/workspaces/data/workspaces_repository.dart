import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../directory/domain/directory_entry.dart';

class WorkspacesRepository {
  WorkspacesRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('workspaces');

  Future<List<DirectoryEntry>> list() async {
    final raw = await _api.get<Object?>(_base);
    return [for (final json in jsonList(raw)) DirectoryEntry(id: json.str('id'), name: json.str('name'))];
  }

  Future<DirectoryEntry> create({required String name, required String slug, String? timezone}) async {
    final json = jsonObject(
      await _api.post<Object?>(
        _base,
        body: {
          'name': name,
          'slug': slug,
          if (timezone != null) 'timezone': timezone,
        },
      ),
    );
    return DirectoryEntry(id: json.str('id'), name: json.str('name'));
  }
}

final workspacesRepositoryProvider = Provider<WorkspacesRepository>(
  (ref) => WorkspacesRepository(ref.watch(apiClientProvider)),
);
