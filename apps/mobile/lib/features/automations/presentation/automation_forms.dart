import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/automations_controller.dart';
import '../domain/automation.dart';
import 'automation_labels.dart';
import 'automation_widgets.dart';

/// Create (when [automation] is null) or edit an automation. Resolves to true when saved.
Future<bool> showAutomationForm(BuildContext context, WidgetRef ref, {Automation? automation}) {
  final l10n = AppLocalizations.of(context);
  final name = TextEditingController(text: automation?.name);
  var trigger = AutomationTriggers.values.contains(automation?.trigger) ? automation?.trigger : null;
  var action = AutomationActions.values.contains(automation?.action) ? automation?.action : null;
  var enabled = automation?.enabled ?? true;
  final actions = ref.read(automationsActionsProvider);

  String? required(String? value) => value == null ? l10n.validationRequired : null;

  return showFormSheet(
    context,
    title: automation == null ? l10n.automationNew : l10n.automationEdit,
    submitLabel: automation == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: name,
        autofocus: automation == null,
        decoration: InputDecoration(labelText: l10n.automationName, hintText: l10n.automationNameHint),
        textInputAction: TextInputAction.next,
        maxLength: resourceNameMaxLength,
        validator: Validators(l10n).minLength(resourceNameMinLength),
      ),
      OptionField<String>(
        label: l10n.automationTriggerField,
        value: trigger,
        options: AutomationTriggers.values,
        labelOf: (value) => automationTriggerLabel(l10n, value),
        validator: required,
        onChanged: (value) => setState(() => trigger = value),
      ),
      OptionField<String>(
        label: l10n.automationActionField,
        value: action,
        options: AutomationActions.values,
        labelOf: (value) => automationActionLabel(l10n, value),
        validator: required,
        onChanged: (value) => setState(() => action = value),
      ),
      if (trigger != null && action != null) AutomationFlow(trigger: trigger, action: action),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l10n.automationEnabledLabel),
        subtitle: Text(l10n.automationEnabledHint),
        value: enabled,
        onChanged: (value) => setState(() => enabled = value),
      ),
    ],
    onSubmit: () async {
      final selectedTrigger = trigger;
      final selectedAction = action;
      if (selectedTrigger == null || selectedAction == null) return;
      final input = AutomationInput(
        name: name.text.trim(),
        trigger: selectedTrigger,
        action: selectedAction,
        enabled: enabled,
      );
      if (automation == null) {
        await actions.create(input);
      } else {
        await actions.update(automation.id, input);
      }
    },
  );
}

/// Runs an automation on demand with an optional note recorded on the run. Resolves to true when it ran.
Future<bool> showRunAutomationForm(BuildContext context, WidgetRef ref, Automation automation) {
  final l10n = AppLocalizations.of(context);
  final detail = TextEditingController(text: l10n.automationRunManualDetail(automation.name));
  return showFormSheet(
    context,
    title: l10n.automationRunTitle(automation.name),
    submitLabel: l10n.automationRunNow,
    fields: (context, setState) => [
      TextFormField(
        controller: detail,
        decoration: InputDecoration(labelText: l10n.automationRunDetail, helperText: l10n.automationRunDetailHint),
        minLines: 2,
        maxLines: 4,
        maxLength: maxAutomationRunDetailLength,
      ),
    ],
    onSubmit: () {
      final note = detail.text.trim();
      return ref.read(automationsActionsProvider).run(automation.id, detail: note.isEmpty ? null : note);
    },
  );
}
