import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../application/custom_fields_controller.dart';
import '../domain/custom_field.dart';
import 'custom_field_labels.dart';

const _monospace = TextStyle(fontFamily: 'monospace');

/// Create (when [field] is null) or edit a custom field. Resolves to true when saved.
Future<bool> showCustomFieldForm(BuildContext context, WidgetRef ref, {CustomField? field, String? entityType}) {
  final l10n = AppLocalizations.of(context);
  final label = TextEditingController(text: field?.label);
  final key = TextEditingController(text: field?.key);
  var keyEdited = field != null;
  var entity = field?.entityType ?? entityType ?? CustomFieldEntityTypes.client;
  var type = field?.type ?? CustomFieldTypes.text;
  var options = field?.options ?? const <String>[];
  var isRequired = field?.isRequired ?? false;
  var isFilterable = field?.isFilterable ?? false;
  var clientVisible = field?.clientVisible ?? false;
  final validators = Validators(l10n);

  String? validateKey(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return l10n.validationRequired;
    return isValidCustomFieldKey(text) ? null : l10n.customFieldKeyInvalid;
  }

  return showFormSheet(
    context,
    title: field == null ? l10n.customFieldNew : l10n.customFieldEdit,
    submitLabel: field == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: label,
        autofocus: field == null,
        decoration: InputDecoration(labelText: l10n.customFieldLabelField, hintText: l10n.customFieldLabelHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: validators.required,
        onChanged: (value) {
          if (!keyEdited) setState(() => key.text = customFieldKeyFromLabel(value));
        },
      ),
      TextFormField(
        controller: key,
        enabled: field == null,
        style: _monospace,
        autocorrect: false,
        decoration: InputDecoration(
          labelText: l10n.customFieldKeyField,
          helperText: field == null ? l10n.customFieldKeyHint : l10n.customFieldKeyLocked,
        ),
        maxLength: resourceKeyMaxLength,
        validator: field == null ? validateKey : null,
        onChanged: (_) => keyEdited = true,
      ),
      if (field == null) ...[
        OptionField<String>(
          label: l10n.customFieldEntityField,
          value: entity,
          options: CustomFieldEntityTypes.values,
          labelOf: (value) => customFieldEntityLabel(l10n, value),
          onChanged: (value) => setState(() => entity = value ?? entity),
        ),
        OptionField<String>(
          label: l10n.customFieldTypeField,
          value: type,
          options: CustomFieldTypes.values,
          labelOf: (value) => customFieldTypeLabel(l10n, value),
          onChanged: (value) => setState(() => type = value ?? type),
        ),
      ] else
        Wrap(
          spacing: context.tokens.sm,
          runSpacing: context.tokens.sm,
          children: [
            StatusBadge(label: customFieldEntityLabel(l10n, entity)),
            StatusBadge(label: customFieldTypeLabel(l10n, type), tone: StatusTone.info),
          ],
        ),
      if (customFieldTypeHasOptions(type))
        FormField<Object?>(
          validator: (_) => options.isEmpty ? l10n.customFieldOptionsRequired : null,
          builder: (state) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TagsField(
                label: l10n.customFieldOptionsField,
                values: options,
                onChanged: (value) {
                  setState(() => options = value);
                  state.didChange(value);
                },
              ),
              if (state.errorText case final error?)
                Padding(
                  padding: EdgeInsets.only(top: context.tokens.xs),
                  child: Text(
                    error,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error),
                  ),
                ),
            ],
          ),
        ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.customFieldRequiredField),
        subtitle: Text(l10n.customFieldRequiredHint),
        value: isRequired,
        onChanged: (value) => setState(() => isRequired = value),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.customFieldFilterableField),
        subtitle: Text(l10n.customFieldFilterableHint),
        value: isFilterable,
        onChanged: (value) => setState(() => isFilterable = value),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.customFieldClientVisibleField),
        subtitle: Text(l10n.customFieldClientVisibleHint),
        value: clientVisible,
        onChanged: (value) => setState(() => clientVisible = value),
      ),
    ],
    onSubmit: () async {
      final input = CustomFieldInput(
        entityType: entity,
        key: key.text.trim(),
        label: label.text.trim(),
        type: type,
        options: options,
        isRequired: isRequired,
        isFilterable: isFilterable,
        clientVisible: clientVisible,
      );
      final actions = ref.read(customFieldsActionsProvider);
      if (field == null) {
        await actions.create(input);
      } else {
        await actions.update(field.id, input);
      }
    },
  );
}
