import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/workflows_controller.dart';
import '../domain/workflow.dart';
import 'workflow_stages_editor.dart';

/// Create (when [workflow] is null) or edit a workflow. Resolves to true when saved.
Future<bool> showWorkflowForm(BuildContext context, WidgetRef ref, {Workflow? workflow}) {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController(text: workflow?.name);
  final sla = TextEditingController(text: workflow?.slaHours?.toString());
  var stages = workflow?.stages ?? const <String>[];
  var requiresClientApproval = workflow?.requiresClientApproval ?? false;
  var active = workflow?.active ?? true;
  final actions = ref.read(workflowsActionsProvider);

  String? slaValidator(String? value) => switch (parseWorkflowSla(value ?? '').issue) {
        WorkflowSlaIssue.notANumber => l10n.workflowSlaInvalid,
        WorkflowSlaIssue.outOfRange => l10n.workflowSlaRange(maxWorkflowSlaHours),
        null => null,
      };

  return showFormSheet(
    context,
    title: workflow == null ? l10n.workflowNew : l10n.workflowEdit,
    submitLabel: workflow == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: workflow == null,
        decoration: InputDecoration(labelText: l10n.workflowName, hintText: l10n.workflowNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(resourceNameMinLength),
      ),
      WorkflowStagesEditor(initial: stages, onChanged: (value) => stages = value),
      if (workflow != null && workflow.stages.isNotEmpty)
        Text(l10n.workflowStagesVersionNote, style: Theme.of(context).textTheme.bodySmall),
      TextFormField(
        controller: sla,
        decoration: InputDecoration(
          labelText: l10n.workflowSlaField,
          helperText: l10n.workflowSlaHint,
          suffixText: l10n.workflowSlaSuffix,
        ),
        keyboardType: TextInputType.number,
        validator: slaValidator,
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.workflowClientApprovalField),
        subtitle: Text(l10n.workflowClientApprovalHint),
        value: requiresClientApproval,
        onChanged: (value) => setState(() => requiresClientApproval = value),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.workflowActiveField),
        subtitle: Text(l10n.workflowActiveHint),
        value: active,
        onChanged: (value) => setState(() => active = value),
      ),
    ],
    onSubmit: () async {
      final input = WorkflowInput(
        name: name.text.trim(),
        stages: stages.map((s) => s.trim()).toList(),
        slaHours: parseWorkflowSla(sla.text).hours,
        requiresClientApproval: requiresClientApproval,
        active: active,
      );
      if (workflow == null) {
        await actions.create(input);
      } else {
        await actions.update(workflow.id, input);
      }
    },
  );
}
