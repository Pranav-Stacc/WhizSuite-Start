import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/custom_fields_repository.dart';
import '../domain/custom_field.dart';

final customFieldsProvider = FutureProvider.autoDispose<List<CustomField>>(
  (ref) => ref.watch(customFieldsRepositoryProvider).list(),
);

/// Custom-field mutations; each refreshes the field list.
class CustomFieldsActions {
  CustomFieldsActions(this._ref);

  final Ref _ref;

  CustomFieldsRepository get _repo => _ref.read(customFieldsRepositoryProvider);

  Future<void> create(CustomFieldInput input) async {
    await _repo.create(input);
    _ref.invalidate(customFieldsProvider);
  }

  Future<void> update(String id, CustomFieldInput input) async {
    await _repo.update(id, input);
    _ref.invalidate(customFieldsProvider);
  }
}

final customFieldsActionsProvider = Provider<CustomFieldsActions>(CustomFieldsActions.new);
