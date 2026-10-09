import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/template.dart';

class TemplatesRepository {
  TemplatesRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('templates');

  Future<List<Template>> list() async => jsonList(await _api.get<Object?>(_base)).map(Template.fromJson).toList();

  Future<Template> get(String id) async => Template.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Template> create(TemplateInput input) async =>
      Template.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toCreateJson())));

  /// A changed definition bumps the template's version.
  Future<void> update(String id, TemplateInput input) => _api.patch<Object?>('$_base/$id', body: input.toUpdateJson());
}

final templatesRepositoryProvider =
    Provider<TemplatesRepository>((ref) => TemplatesRepository(ref.watch(apiClientProvider)));
