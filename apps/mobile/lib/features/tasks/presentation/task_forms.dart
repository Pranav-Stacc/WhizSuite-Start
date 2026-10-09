import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/tasks_controller.dart';
import '../domain/task.dart';
import 'task_status.dart';

const double _sheetMaxHeightFactor = 0.75;

/// Loads a directory for a picker, toasting the failure instead of opening a broken form.
Future<Directory?> _loadDirectory(BuildContext context, WidgetRef ref, FutureProvider<Directory> provider) async {
  final l10n = AppLocalizations.of(context);
  try {
    return await ref.read(provider.future);
  } on ApiException catch (error) {
    if (context.mounted) showToast(context, describeError(l10n, error));
    return null;
  }
}

/// "Client · Project" label for project pickers.
String taskProjectLabel(AppLocalizations l10n, Directory projects, Directory clients, String projectId) {
  final project = projects[projectId];
  final name = project?.name ?? l10n.valueUnknown;
  final client = clients.nameOf(project?.parentId);
  return client == null ? name : l10n.taskProjectWithClient(client, name);
}

/// Create (when [task] is null) or edit a task; [projectId] preselects the project of a new task.
/// Resolves to true when saved. Public so the projects feature can add tasks to a project.
Future<bool> showTaskForm(BuildContext context, WidgetRef ref, {Task? task, String? projectId}) async {
  final l10n = AppLocalizations.of(context);
  final projects = await _loadDirectory(context, ref, projectDirectoryProvider);
  if (projects == null || !context.mounted) return false;
  final clients = await _loadDirectory(context, ref, clientDirectoryProvider);
  if (clients == null || !context.mounted) return false;
  final staff = await _loadDirectory(context, ref, staffDirectoryProvider);
  if (staff == null || !context.mounted) return false;
  if (projects.entries.isEmpty) {
    showToast(context, l10n.taskNoProjects);
    return false;
  }

  final actions = ref.read(tasksActionsProvider);
  final canTransition = task == null || ref.read(accessPolicyProvider).can(Permissions.tasksTransition);
  final validators = Validators(l10n);
  final title = TextEditingController(text: task?.title);
  final description = TextEditingController(text: task?.description);
  final estimateMinutes = task?.estimateMinutes;
  final estimate = TextEditingController(
    text: estimateMinutes == null || estimateMinutes == 0 ? '' : hoursFromMinutes(estimateMinutes),
  );

  final initialProject = task?.projectId ?? projectId;
  var project = projects[initialProject] == null ? null : initialProject;
  var status = task?.status ?? TaskStatuses.todo;
  var priority = task?.priority ?? Priorities.medium;
  var due = task?.dueDate;
  var assignee = task?.assigneeUserId;

  final projectOptions = projects.entries.map((p) => p.id).toList()
    ..sort((a, b) => taskProjectLabel(l10n, projects, clients, a).compareTo(taskProjectLabel(l10n, projects, clients, b)));
  final currentAssignee = task?.assigneeUserId;
  final assigneeOptions = [
    ...staff.entries.map((m) => m.id),
    if (currentAssignee != null && staff[currentAssignee] == null) currentAssignee,
  ];

  String? optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  return showFormSheet(
    context,
    title: task == null ? l10n.taskNew : l10n.taskEdit,
    submitLabel: task == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      OptionField<String>(
        label: l10n.taskProject,
        value: project,
        options: projectOptions,
        labelOf: (id) => taskProjectLabel(l10n, projects, clients, id),
        validator: (value) => value == null ? l10n.validationRequired : null,
        onChanged: (value) => setState(() => project = value),
      ),
      TextFormField(
        controller: title,
        autofocus: task == null,
        textCapitalization: TextCapitalization.sentences,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(labelText: l10n.taskTitleLabel, hintText: l10n.taskTitleHint),
        maxLength: resourceNameMaxLength,
        validator: validators.required,
      ),
      TextFormField(
        controller: description,
        textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(labelText: l10n.taskDescription, alignLabelWithHint: true),
        minLines: 2,
        maxLines: 6,
        maxLength: resourceTextMaxLength,
      ),
      if (canTransition)
        OptionField<String>(
          label: l10n.taskStatusLabel,
          value: status,
          options: TaskStatuses.values,
          labelOf: (s) => taskStatusLabel(l10n, s),
          onChanged: (value) => setState(() => status = value ?? status),
        ),
      OptionField<String>(
        label: l10n.taskPriorityLabel,
        value: priority,
        options: Priorities.values,
        labelOf: (p) => taskPriorityLabel(l10n, p),
        onChanged: (value) => setState(() => priority = value ?? priority),
      ),
      DateField(
        label: l10n.taskDueDate,
        value: due,
        // The API cannot clear a due date once set, so an existing one can only be moved.
        required: task?.dueDate != null,
        onChanged: (value) => setState(() => due = value),
      ),
      TextFormField(
        controller: estimate,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(labelText: l10n.taskEstimateHours, hintText: l10n.taskEstimateHint),
        validator: (value) =>
            (value == null || value.trim().isEmpty || minutesFromHours(value) != null) ? null : l10n.taskEstimateInvalid,
      ),
      OptionField<String>(
        label: l10n.taskAssignee,
        value: assignee,
        options: assigneeOptions,
        allowNone: true,
        labelOf: (id) => staff.nameOf(id) ?? l10n.valueUnknown,
        onChanged: (value) => setState(() => assignee = value),
      ),
    ],
    onSubmit: () async {
      final selectedProject = project;
      if (selectedProject == null) return;
      final minutes = minutesFromHours(estimate.text);
      if (task == null) {
        await actions.create(
          TaskInput(
            projectId: selectedProject,
            title: title.text.trim(),
            priority: priority,
            description: optional(description),
            status: status,
            dueDate: due,
            estimateMinutes: minutes,
            assigneeUserId: assignee,
          ),
        );
        return;
      }
      final clearsEstimate = minutes == null && (task.estimateMinutes ?? 0) > 0;
      await actions.update(
        task.id,
        TaskPatch(
          projectId: selectedProject == task.projectId ? null : selectedProject,
          title: title.text.trim(),
          description: description.text.trim(),
          priority: priority,
          dueDate: due,
          estimateMinutes: clearsEstimate ? 0 : minutes,
          assigneeUserId: assignee,
          setsAssignee: assignee != task.assigneeUserId,
        ),
      );
      if (status != task.status) await actions.transition(task.id, status);
    },
  );
}

/// Single-choice sheet over toned values (status, priority); resolves to the picked value or null.
Future<String?> _pickToned(
  BuildContext context, {
  required String title,
  required List<String> options,
  required String current,
  required String Function(String value) labelOf,
  required StatusTone Function(String value) toneOf,
}) =>
    showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => _SheetList(
        title: title,
        children: [
          for (final option in options)
            ListTile(
              leading: _ToneDot(color: toneOf(option).color(context.tokens)),
              title: Text(labelOf(option)),
              selected: option == current,
              trailing: option == current ? const Icon(Icons.check) : null,
              onTap: () => Navigator.of(context).pop(option),
            ),
        ],
      ),
    );

/// Bottom sheet listing every status; moves the task through the transition endpoint.
Future<void> showTaskStatusSheet(BuildContext context, WidgetRef ref, Task task) async {
  final l10n = AppLocalizations.of(context);
  final next = await _pickToned(
    context,
    title: l10n.taskStatusChange,
    options: TaskStatuses.values,
    current: task.status,
    labelOf: (s) => taskStatusLabel(l10n, s),
    toneOf: taskStatusTone,
  );
  if (next == null || next == task.status || !context.mounted) return;
  await runAction(
    context,
    () => ref.read(tasksActionsProvider).transition(task.id, next),
    success: l10n.taskMovedToast(taskStatusLabel(l10n, next)),
  );
}

/// Bottom sheet listing every priority; saves the choice immediately.
Future<void> showTaskPrioritySheet(BuildContext context, WidgetRef ref, Task task) async {
  final l10n = AppLocalizations.of(context);
  final next = await _pickToned(
    context,
    title: l10n.taskPriorityChange,
    options: Priorities.values,
    current: task.priority,
    labelOf: (p) => taskPriorityLabel(l10n, p),
    toneOf: taskPriorityTone,
  );
  if (next == null || next == task.priority || !context.mounted) return;
  await runAction(
    context,
    () => ref.read(tasksActionsProvider).update(task.id, TaskPatch(priority: next)),
    success: l10n.savedToast,
  );
}

/// Bottom sheet of staff members (plus "Unassigned") that reassigns the task.
Future<void> showTaskAssigneeSheet(BuildContext context, WidgetRef ref, Task task) async {
  final l10n = AppLocalizations.of(context);
  final staff = await _loadDirectory(context, ref, staffDirectoryProvider);
  if (staff == null || !context.mounted) return;
  final picked = await showModalBottomSheet<(String?,)>(
    context: context,
    showDragHandle: true,
    useSafeArea: true,
    isScrollControlled: true,
    builder: (context) => _SheetList(
      title: l10n.taskAssigneeChange,
      children: [
        ListTile(
          leading: const CircleAvatar(child: Icon(Icons.person_off_outlined)),
          title: Text(l10n.unassigned),
          selected: task.assigneeUserId == null,
          trailing: task.assigneeUserId == null ? const Icon(Icons.check) : null,
          onTap: () => Navigator.of(context).pop((null,)),
        ),
        for (final member in staff.entries)
          ListTile(
            leading: InitialsAvatar(name: member.name, seed: member.id),
            title: Text(member.name),
            subtitle: member.detail == null ? null : Text(member.detail ?? ''),
            selected: member.id == task.assigneeUserId,
            trailing: member.id == task.assigneeUserId ? const Icon(Icons.check) : null,
            onTap: () => Navigator.of(context).pop((member.id,)),
          ),
      ],
    ),
  );
  if (picked == null || picked.$1 == task.assigneeUserId || !context.mounted) return;
  await runAction(
    context,
    () => ref.read(tasksActionsProvider).update(task.id, TaskPatch.assign(picked.$1)),
    success: l10n.savedToast,
  );
}

class _SheetList extends StatelessWidget {
  const _SheetList({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * _sheetMaxHeightFactor),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.sm),
            child: Semantics(header: true, child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
          ),
          Flexible(
            child: ListView(shrinkWrap: true, padding: EdgeInsets.only(bottom: tokens.lg), children: children),
          ),
        ],
      ),
    );
  }
}

class _ToneDot extends StatelessWidget {
  const _ToneDot({required this.color});

  static const _size = 10.0;

  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        width: _size,
        height: _size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );
}
