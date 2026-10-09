import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/projects_controller.dart';
import '../domain/project.dart';
import 'project_status.dart';

/// Create (when [project] is null) or edit a project; [clientId] preselects the client of a new one.
/// Resolves to the saved project id, or null when dismissed.
Future<String?> showProjectForm(BuildContext context, WidgetRef ref, {Project? project, String? clientId}) async {
  final l10n = AppLocalizations.of(context);
  final Directory clients;
  final Directory staff;
  try {
    clients = await ref.read(clientDirectoryProvider.future);
    staff = await ref.read(staffDirectoryProvider.future);
  } on ApiException catch (error) {
    if (context.mounted) showToast(context, describeError(l10n, error));
    return null;
  }
  if (!context.mounted) return null;
  if (project == null && clients.entries.isEmpty) {
    showToast(context, l10n.projectNoClients);
    return null;
  }

  final actions = ref.read(projectsActionsProvider);
  final validators = Validators(l10n);
  final currency = project?.currency ?? context.formats.currency;
  final name = TextEditingController(text: project?.name);
  final type = TextEditingController(text: project?.type);
  final initialBudget = project?.budgetMinor;
  final budget = TextEditingController(text: initialBudget == null ? '' : majorFromMinor(initialBudget));

  final preselected = project?.clientId ?? clientId;
  var client = clients[preselected] == null ? null : preselected;
  var status = project?.status ?? ProjectStatuses.active;
  var start = project?.startDate;
  var end = project?.endDate;
  var owner = project?.ownerUserId;
  String? savedId;

  final clientOptions = clients.entries.map((c) => c.id).toList()
    ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));
  final currentOwner = project?.ownerUserId;
  final ownerOptions = [
    ...staff.entries.map((m) => m.id),
    if (currentOwner != null && staff[currentOwner] == null) currentOwner,
  ];

  String? optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  final saved = await showFormSheet(
    context,
    title: project == null ? l10n.projectNew : l10n.projectEdit,
    submitLabel: project == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      if (project == null)
        OptionField<String>(
          label: l10n.projectClient,
          value: client,
          options: clientOptions,
          labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
          validator: (value) => value == null ? l10n.validationRequired : null,
          onChanged: (value) => setState(() => client = value),
        )
      else
        InputDecorator(
          decoration: InputDecoration(labelText: l10n.projectClient, helperText: l10n.projectClientLocked, enabled: false),
          child: Text(clients.nameOf(project.clientId) ?? l10n.valueUnknown),
        ),
      TextFormField(
        controller: name,
        autofocus: project == null,
        textCapitalization: TextCapitalization.words,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(labelText: l10n.projectName, hintText: l10n.projectNameHint),
        maxLength: projectNameMaxLength,
        validator: validators.required,
      ),
      TextFormField(
        controller: type,
        textCapitalization: TextCapitalization.words,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(labelText: l10n.projectType, hintText: l10n.projectTypeHint),
        maxLength: projectTypeMaxLength,
      ),
      OptionField<String>(
        label: l10n.projectStatusLabel,
        value: status,
        options: ProjectStatuses.values,
        labelOf: (s) => projectStatusLabel(l10n, s),
        onChanged: (value) => setState(() => status = value ?? status),
      ),
      // The API cannot clear dates once set, so existing ones can only be moved.
      DateField(
        label: l10n.projectStartDate,
        value: start,
        required: project?.startDate != null,
        onChanged: (value) => setState(() => start = value),
      ),
      DateField(
        label: l10n.projectEndDate,
        value: end,
        // No firstDate: the picker asserts when its initial date (today or the value) precedes it.
        required: project?.endDate != null,
        onChanged: (value) => setState(() => end = value),
      ),
      FormField<void>(
        validator: (_) {
          final from = start;
          final to = end;
          return from != null && to != null && to.isBefore(from) ? l10n.projectEndBeforeStart : null;
        },
        builder: (field) => field.hasError
            ? Text(field.errorText ?? '', style: TextStyle(color: Theme.of(context).colorScheme.error))
            : const SizedBox.shrink(),
      ),
      TextFormField(
        controller: budget,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(labelText: l10n.projectBudgetField(currency)),
        validator: (value) =>
            value == null || value.trim().isEmpty || minorFromMajor(value) != null ? null : l10n.projectBudgetInvalid,
      ),
      OptionField<String>(
        label: l10n.projectOwner,
        value: owner,
        options: ownerOptions,
        allowNone: true,
        labelOf: (id) => staff.nameOf(id) ?? l10n.valueUnknown,
        onChanged: (value) => setState(() => owner = value),
      ),
    ],
    onSubmit: () async {
      final input = ProjectInput(
        name: name.text.trim(),
        clientId: project == null ? client : null,
        type: optional(type),
        status: status,
        startDate: start,
        endDate: end,
        budgetMinor: minorFromMajor(budget.text) ?? (initialBudget != null && initialBudget > 0 ? 0 : null),
        ownerUserId: owner,
      );
      if (project == null) {
        savedId = (await actions.create(input)).id;
      } else {
        await actions.update(project.id, input);
        savedId = project.id;
      }
    },
  );
  return saved ? savedId : null;
}
