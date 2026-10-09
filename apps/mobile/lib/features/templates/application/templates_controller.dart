import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/templates_repository.dart';
import '../domain/template.dart';

final templatesProvider = FutureProvider.autoDispose<List<Template>>(
  (ref) => ref.watch(templatesRepositoryProvider).list(),
);

final templateProvider = FutureProvider.autoDispose.family<Template, String>(
  (ref, id) => ref.watch(templatesRepositoryProvider).get(id),
);

/// Template mutations; each refreshes every view that shows templates.
class TemplatesActions {
  TemplatesActions(this._ref);

  final Ref _ref;

  TemplatesRepository get _repo => _ref.read(templatesRepositoryProvider);

  Future<Template> create(TemplateInput input) async {
    final template = await _repo.create(input);
    _ref.invalidate(templatesProvider);
    return template;
  }

  Future<void> update(String id, TemplateInput input) async {
    await _repo.update(id, input);
    _ref
      ..invalidate(templatesProvider)
      ..invalidate(templateProvider(id));
  }
}

final templatesActionsProvider = Provider<TemplatesActions>(TemplatesActions.new);
