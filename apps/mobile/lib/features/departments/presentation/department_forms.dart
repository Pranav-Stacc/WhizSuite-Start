import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/departments_controller.dart';
import '../domain/department.dart';

/// Non-breaking spaces per tree level so nested departments read as a hierarchy in the picker.
const _indentPerLevel = '\u00A0\u00A0\u00A0\u00A0';

/// Create a department, optionally under [parentId]. Resolves to true when created.
Future<bool> showDepartmentForm(BuildContext context, WidgetRef ref, {String? parentId}) {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController();
  var parent = parentId;
  final tree = flattenTree(ref.read(departmentTreeProvider).value ?? const []);
  final names = {for (final node in tree) node.department.id: node};

  return showFormSheet(
    context,
    title: l10n.departmentNew,
    submitLabel: l10n.create,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.departmentName, hintText: l10n.departmentNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(resourceNameMinLength),
      ),
      if (tree.isNotEmpty)
        OptionField<String>(
          label: l10n.departmentParent,
          value: parent,
          allowNone: true,
          options: [for (final node in tree) node.department.id],
          labelOf: (id) {
            final node = names[id];
            return node == null ? id : '${_indentPerLevel * node.depth}${node.department.name}';
          },
          onChanged: (value) => setState(() => parent = value),
        ),
      Text(
        parent == null ? l10n.departmentParentNone : l10n.departmentParentHint(names[parent]?.department.path ?? ''),
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ],
    onSubmit: () => ref.read(departmentsActionsProvider).create(name: name.text.trim(), parentId: parent),
  );
}

/// Create a team. Resolves to true when created.
Future<bool> showTeamForm(BuildContext context, WidgetRef ref) {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController();
  final description = TextEditingController();
  return showFormSheet(
    context,
    title: l10n.departmentTeamNew,
    submitLabel: l10n.create,
    fields: (context, setState) => [
      Text(l10n.departmentTeamBody, style: Theme.of(context).textTheme.bodySmall),
      TextFormField(
        controller: name,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.departmentTeamName, hintText: l10n.departmentTeamNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(resourceNameMinLength),
      ),
      TextFormField(
        controller: description,
        decoration: InputDecoration(labelText: l10n.departmentTeamDescription),
        minLines: 2,
        maxLines: 4,
        maxLength: resourceTextMaxLength,
      ),
    ],
    onSubmit: () {
      final text = description.text.trim();
      return ref
          .read(departmentsActionsProvider)
          .createTeam(name: name.text.trim(), description: text.isEmpty ? null : text);
    },
  );
}
