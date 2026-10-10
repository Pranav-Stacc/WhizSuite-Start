import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/app_dialog.dart';
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
  var assignees = Set<String>.from(task?.assigneeUserIds ?? const []);

  final projectOptions = projects.entries.map((p) => p.id).toList()
    ..sort((a, b) => taskProjectLabel(l10n, projects, clients, a).compareTo(taskProjectLabel(l10n, projects, clients, b)));
  final assigneeOptions = [
    ...staff.entries.map((m) => m.id),
    for (final id in assignees)
      if (staff[id] == null) id,
  ];

  String? optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

  return showFormSheet(
    context,
    title: task == null ? l10n.taskNew : l10n.taskEdit,
    submitLabel: task == null ? l10n.create : l10n.save,
    size: AppDialogSize.large,
    presentation: AppDialogPresentation.bottomSheet,
    fields: (context, setState) => [
      OptionField<String>(
        label: l10n.taskProject,
        value: project,
        options: projectOptions,
        allowNone: true,
        labelOf: (id) => taskProjectLabel(l10n, projects, clients, id),
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
      InputDecorator(
        decoration: InputDecoration(labelText: l10n.taskAssignee, border: InputBorder.none),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final id in assigneeOptions)
              FilterChip(
                avatar: InitialsAvatar(name: staff.nameOf(id) ?? id, seed: id, size: 20),
                label: Text(staff.nameOf(id) ?? l10n.valueUnknown),
                selected: assignees.contains(id),
                onSelected: (selected) => setState(() {
                  if (selected) {
                    assignees.add(id);
                  } else {
                    assignees.remove(id);
                  }
                }),
              ),
          ],
        ),
      ),
    ],
    onSubmit: () async {
      final minutes = minutesFromHours(estimate.text);
      final assigneeList = assignees.toList();
      if (task == null) {
        await actions.create(
          TaskInput(
            projectId: project,
            title: title.text.trim(),
            priority: priority,
            description: optional(description),
            status: status,
            dueDate: due,
            estimateMinutes: minutes,
            assigneeUserIds: assigneeList,
          ),
        );
        return;
      }
      final clearsEstimate = minutes == null && (task.estimateMinutes ?? 0) > 0;
      final projectChanged = project != task.projectId;
      await actions.update(
        task.id,
        TaskPatch(
          projectId: projectChanged && project != null ? project : null,
          clearProject: projectChanged && project == null,
          title: title.text.trim(),
          description: description.text.trim(),
          priority: priority,
          dueDate: due,
          estimateMinutes: clearsEstimate ? 0 : minutes,
          assigneeUserIds: assigneeList,
          setsAssignees: true,
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
      isScrollControlled: true,
      builder: (context) => _SheetList(
        title: title,
        children: [
          for (final value in options)
            ListTile(
              leading: _ToneDot(color: toneOf(value).color(context.tokens)),
              title: Text(labelOf(value)),
              selected: value == current,
              trailing: value == current ? const Icon(Icons.check) : null,
              onTap: () => Navigator.of(context).pop(value),
            ),
        ],
      ),
    );

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

/// Multi-select sheet of staff members that replaces the task assignee set.
Future<void> showTaskAssigneeSheet(BuildContext context, WidgetRef ref, Task task) async {
  final l10n = AppLocalizations.of(context);
  final staff = await _loadDirectory(context, ref, staffDirectoryProvider);
  if (staff == null || !context.mounted) return;
  var selected = Set<String>.from(task.assigneeUserIds);
  final saved = await showModalBottomSheet<List<String>>(
    context: context,
    showDragHandle: true,
    useSafeArea: true,
    isScrollControlled: true,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => _SheetList(
        title: l10n.taskAssigneeChange,
        children: [
          for (final member in staff.entries)
            CheckboxListTile(
              secondary: InitialsAvatar(name: member.name, seed: member.id),
              title: Text(member.name),
              subtitle: member.detail == null ? null : Text(member.detail ?? ''),
              value: selected.contains(member.id),
              onChanged: (checked) => setState(() {
                if (checked == true) {
                  selected.add(member.id);
                } else {
                  selected.remove(member.id);
                }
              }),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(selected.toList()),
              child: Text(l10n.taskAssigneesDone),
            ),
          ),
        ],
      ),
    ),
  );
  if (saved == null || !context.mounted) return;
  final before = {...task.assigneeUserIds};
  final after = {...saved};
  if (before.length == after.length && before.containsAll(after)) return;
  await runAction(
    context,
    () => ref.read(tasksActionsProvider).update(task.id, TaskPatch.assignAll(saved)),
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
