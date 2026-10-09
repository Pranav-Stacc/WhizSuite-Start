import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/templates_controller.dart';
import '../domain/template.dart';
import 'template_labels.dart';

/// Create (when [template] is null) or edit a template. Resolves to true when saved.
Future<bool> showTemplateForm(BuildContext context, WidgetRef ref, {Template? template}) {
  final l10n = AppLocalizations.of(context);
  final existing = template?.definition ?? const TemplateDefinition();
  final name = TextEditingController(text: template?.name);
  final description = TextEditingController(text: existing.description);
  final body = TextEditingController(text: existing.body);
  var type = template?.type ?? TemplateTypes.project;
  var scope = template?.scope ?? TemplateScopes.organization;
  var clientId = existing.clientId;
  var items = existing.items;
  final clients = ref.read(clientDirectoryProvider).value ?? Directory.empty;

  return showFormSheet(
    context,
    title: template == null ? l10n.templateNew : l10n.templateEdit,
    submitLabel: template == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: template == null,
        decoration: InputDecoration(labelText: l10n.templateName, hintText: l10n.templateNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).required,
      ),
      if (template == null)
        OptionField<String>(
          label: l10n.templateTypeField,
          value: type,
          options: TemplateTypes.values,
          labelOf: (value) => templateTypeLabel(l10n, value),
          onChanged: (value) => setState(() => type = value ?? type),
        ),
      OptionField<String>(
        label: l10n.templateScopeField,
        value: scope,
        options: TemplateScopes.values,
        labelOf: (value) => templateScopeLabel(l10n, value),
        onChanged: (value) => setState(() => scope = value ?? scope),
      ),
      if (scope == TemplateScopes.client)
        OptionField<String>(
          label: l10n.templateClientField,
          value: clients[clientId] == null ? null : clientId,
          options: [for (final client in clients.entries) client.id],
          labelOf: (id) => clients.nameOf(id) ?? id,
          validator: (value) => value == null ? l10n.validationRequired : null,
          onChanged: (value) => setState(() => clientId = value),
        ),
      TextFormField(
        controller: description,
        decoration: InputDecoration(labelText: l10n.templateDescriptionField, alignLabelWithHint: true),
        minLines: 2,
        maxLines: 4,
        maxLength: resourceTextMaxLength,
      ),
      TagsField(
        label: templateItemsLabel(l10n, type),
        values: items,
        onChanged: (value) => setState(() => items = value),
      ),
      TextFormField(
        controller: body,
        decoration: InputDecoration(
          labelText: l10n.templateBodyField,
          helperText: l10n.templateBodyHint,
          helperMaxLines: 2,
          alignLabelWithHint: true,
        ),
        minLines: 4,
        maxLines: 12,
        maxLength: resourceTextMaxLength,
        keyboardType: TextInputType.multiline,
      ),
    ],
    onSubmit: () async {
      final input = TemplateInput(
        name: name.text.trim(),
        type: type,
        scope: scope,
        definition: existing.copyWith(
          description: description.text.trim(),
          body: body.text.trim(),
          items: items,
          clientId: clientId,
        ),
      );
      final actions = ref.read(templatesActionsProvider);
      if (template == null) {
        await actions.create(input);
      } else {
        await actions.update(template.id, input);
      }
    },
  );
}
