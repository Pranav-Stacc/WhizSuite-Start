import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/custom_field.dart';

class CustomFieldsRepository {
  CustomFieldsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('custom-fields');

  Future<List<CustomField>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(CustomField.fromJson).toList();

  Future<CustomField> create(CustomFieldInput input) async =>
      CustomField.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toCreateJson())));

  Future<void> update(String id, CustomFieldInput input) => _api.patch<Object?>('$_base/$id', body: input.toUpdateJson());
}

final customFieldsRepositoryProvider =
    Provider<CustomFieldsRepository>((ref) => CustomFieldsRepository(ref.watch(apiClientProvider)));
