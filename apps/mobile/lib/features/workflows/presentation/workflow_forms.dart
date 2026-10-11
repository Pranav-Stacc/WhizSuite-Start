import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../clients/application/clients_controller.dart';
import '../../departments/application/departments_controller.dart';
import '../../projects/application/projects_controller.dart';
import '../../roles/application/roles_controller.dart';
import '../../team/application/team_controller.dart';
import '../../team/domain/member.dart';
import '../application/workflows_controller.dart';
import '../domain/workflow.dart';
import 'workflow_stages_editor.dart';

Future<List<T>> _quiet<T>(Future<List<T>> future) async {
  try {
    return await future;
  } catch (_) {
    return <T>[];
  }
}

/// Create (when [workflow] is null) or edit a workflow. Resolves to true when saved.
Future<bool> showWorkflowForm(BuildContext context, WidgetRef ref, {Workflow? workflow}) async {
  final l10n = AppLocalizations.of(context);
  final roles = await ref.read(assignableRolesProvider.future);
  final members = (await ref.read(membersProvider.future))
      .where((member) => member.status == MemberStatuses.active)
      .toList();
  final departments = await _quiet(ref.read(departmentsProvider.future));
  final clients = await _quiet(ref.read(clientsProvider.future));
  final projects = await _quiet(ref.read(projectsProvider.future));
  if (!context.mounted) return false;
  final name = TextEditingController(text: workflow?.name);
  final sla = TextEditingController(text: workflow?.slaHours?.toString() ?? (workflow == null ? '48' : ''));
  var stages = workflow?.stages ?? const <WorkflowStage>[];
  var entityType = workflow?.entityType ?? WorkflowSubjects.content;
  var scopeClientId = workflow?.scopeId;
  var requiresClientApproval = workflow?.requiresClientApproval ?? true;
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
      DropdownButtonFormField<String>(
        initialValue: entityType,
        decoration: InputDecoration(labelText: l10n.workflowSubjectField, isDense: true),
        items: [
          DropdownMenuItem(value: WorkflowSubjects.content, child: Text(l10n.workflowSubjectContent)),
          DropdownMenuItem(value: WorkflowSubjects.task, child: Text(l10n.workflowSubjectTask)),
          DropdownMenuItem(value: WorkflowSubjects.project, child: Text(l10n.workflowSubjectProject)),
          DropdownMenuItem(value: WorkflowSubjects.custom, child: Text(l10n.workflowSubjectCustom)),
        ],
        onChanged: (value) {
          if (value == null) return;
          setState(() => entityType = value);
        },
      ),
      DropdownButtonFormField<String?>(
        initialValue: scopeClientId,
        decoration: InputDecoration(labelText: l10n.workflowScopeField, isDense: true),
        items: [
          DropdownMenuItem(value: null, child: Text(l10n.workflowScopeOrganization)),
          for (final client in clients)
            DropdownMenuItem(value: client.id, child: Text(client.name, overflow: TextOverflow.ellipsis)),
        ],
        onChanged: (value) => setState(() => scopeClientId = value),
      ),
      WorkflowStagesEditor(
        initial: stages,
        roles: roles,
        members: members,
        designations: [
          for (final department in departments)
            for (final position in department.positions)
              WorkflowPickOption(id: position.id, label: '${position.name} · ${department.name}'),
        ],
        departments: [for (final department in departments) WorkflowPickOption(id: department.id, label: department.name)],
        clients: [for (final client in clients) WorkflowPickOption(id: client.id, label: client.name)],
        clientContacts: [
          for (final client in clients)
            for (final contact in client.contacts)
              WorkflowPickOption(id: contact.id, label: '${contact.name} · ${client.name}'),
        ],
        projects: [for (final project in projects) WorkflowPickOption(id: project.id, label: project.name)],
        onChanged: (value) => stages = value,
      ),
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
        entityType: entityType,
        scopeType: scopeClientId == null ? 'ORGANIZATION' : 'CLIENT',
        scopeId: scopeClientId,
        stages: stages,
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
