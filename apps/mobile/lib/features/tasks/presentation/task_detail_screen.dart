import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../clients/clients_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../projects/projects_routes.dart';
import '../application/tasks_controller.dart';
import '../domain/task.dart';
import '../tasks_routes.dart';
import 'entity_link.dart';
import 'task_forms.dart';
import 'task_status.dart';

enum _TaskMenu { delete }

class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({required this.taskId, super.key});

  final String taskId;

  Future<void> _delete(BuildContext context, WidgetRef ref, Task task) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(task.title),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final actions = ref.read(tasksActionsProvider);
    final deleted = await runAction(context, () => actions.delete(task.id), success: l10n.deletedToast);
    if (!deleted || !context.mounted) return;
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(TasksRoutes.root);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final task = ref.watch(taskProvider(taskId));
    final loaded = task.value;

    return PageScaffold(
      title: loaded?.title ?? l10n.tasksTitle,
      actions: [
        if (loaded != null) ...[
          PermissionGate(
            anyOf: const [Permissions.tasksEdit],
            child: IconButton(
              tooltip: l10n.taskEdit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                final saved = await showTaskForm(context, ref, task: loaded);
                if (saved && context.mounted) showToast(context, l10n.savedToast);
              },
            ),
          ),
          PermissionGate(
            anyOf: const [Permissions.tasksDelete],
            child: PopupMenuButton<_TaskMenu>(
              tooltip: l10n.moreActions,
              onSelected: (_) => _delete(context, ref, loaded),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: _TaskMenu.delete,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                    title: Text(l10n.taskDelete),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
      body: AsyncValueView<Task>(
        value: task,
        onRetry: () => ref.invalidate(taskProvider(taskId)),
        data: (task) => _TaskDetailBody(task: task, onRefresh: () => ref.refresh(taskProvider(taskId).future)),
      ),
    );
  }
}

class _TaskDetailBody extends ConsumerWidget {
  const _TaskDetailBody({required this.task, required this.onRefresh});

  static const _wideBreakpoint = 720.0;

  final Task task;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final canTransition = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.tasksTransition)));
    final dueDate = task.dueDate;
    final due = dueDate == null ? null : formats.due(dueDate, done: task.isDone);

    final header = FadeSlideIn(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(task.title, style: text.headlineSmall)),
          SizedBox(height: tokens.sm),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              StatusBadge(label: taskStatusLabel(l10n, task.status), tone: taskStatusTone(task.status)),
              StatusBadge(label: taskPriorityLabel(l10n, task.priority), tone: taskPriorityTone(task.priority)),
              if (due != null) StatusBadge(label: due.label, tone: due.tone),
            ],
          ),
        ],
      ),
    );

    final status = SectionCard(
      title: l10n.taskStatusLabel,
      child: Wrap(
        spacing: tokens.sm,
        runSpacing: tokens.sm,
        children: [
          for (final value in TaskStatuses.values)
            ChoiceChip(
              avatar: Icon(Icons.circle, size: 10, color: taskStatusTone(value).color(tokens)),
              label: Text(taskStatusLabel(l10n, value)),
              selected: value == task.status,
              onSelected: !canTransition || value == task.status
                  ? null
                  : (_) => runAction(
                        context,
                        () => ref.read(tasksActionsProvider).transition(task.id, value),
                        success: l10n.taskMovedToast(taskStatusLabel(l10n, value)),
                      ),
            ),
        ],
      ),
    );

    final description = SectionCard(
      title: l10n.taskDescription,
      child: task.description.trim().isEmpty
          ? Text(l10n.taskDescriptionEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
          : SelectableText(task.description, style: text.bodyLarge),
    );

    final details = SectionCard(title: l10n.details, child: _TaskFacts(task: task));

    final metrics = FadeSlideIn(
      index: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final estimate = task.estimateMinutes;
          final tiles = [
            MetricTile(
              label: l10n.taskDueDate,
              icon: Icons.event_outlined,
              value: dueDate == null ? l10n.noDueDate : formats.date(dueDate),
              caption: due?.label,
              tone: due?.tone ?? StatusTone.neutral,
            ),
            MetricTile(
              label: l10n.taskEstimate,
              icon: Icons.schedule,
              value: estimate == null || estimate == 0 ? l10n.valueNone : formats.duration(estimate),
            ),
            MetricTile(
              label: l10n.taskPriorityLabel,
              icon: Icons.flag_outlined,
              value: taskPriorityLabel(l10n, task.priority),
              tone: taskPriorityTone(task.priority),
            ),
            MetricTile(
              label: l10n.taskCreatedOn,
              icon: Icons.history,
              value: formats.relative(task.createdAt),
              caption: formats.shortDate(task.createdAt),
            ),
          ];
          final columns = gridColumns(constraints.maxWidth, minTileWidth: 160, max: 4);
          final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
          return Wrap(
            spacing: tokens.md,
            runSpacing: tokens.md,
            children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
          );
        },
      ),
    );

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        header,
        SizedBox(height: tokens.xl),
        metrics,
        SizedBox(height: tokens.xl),
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < _wideBreakpoint) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FadeSlideIn(index: 2, child: status),
                  SizedBox(height: tokens.xl),
                  FadeSlideIn(index: 3, child: details),
                  SizedBox(height: tokens.xl),
                  FadeSlideIn(index: 4, child: description),
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FadeSlideIn(index: 2, child: status),
                      SizedBox(height: tokens.xl),
                      FadeSlideIn(index: 4, child: description),
                    ],
                  ),
                ),
                SizedBox(width: tokens.xl),
                Expanded(flex: 2, child: FadeSlideIn(index: 3, child: details)),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _TaskFacts extends ConsumerWidget {
  const _TaskFacts({required this.task});

  static const _avatarSize = 24.0;

  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final canEdit = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.tasksEdit)));
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;

    final project = task.projectId == null ? null : projects[task.projectId];
    final clientId = task.clientId ?? project?.parentId;
    final clientName = clients.nameOf(clientId);
    final assigneeNames = [
      for (final id in task.assigneeUserIds) ?members.nameOf(id),
    ];
    final assigneeLabel = assigneeNames.isEmpty
        ? l10n.unassigned
        : assigneeNames.length == 1
            ? assigneeNames.first
            : l10n.taskAssignedToMany(assigneeNames.length);
    final dueDate = task.dueDate;
    final estimate = task.estimateMinutes;

    final assigneeValue = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final id in task.assigneeUserIds.take(3)) ...[
          InitialsAvatar(name: members.nameOf(id) ?? id, seed: id, size: _avatarSize),
          SizedBox(width: tokens.xs),
        ],
        if (task.assigneeUserIds.isNotEmpty) SizedBox(width: tokens.sm),
        Flexible(child: Text(assigneeLabel, overflow: TextOverflow.ellipsis)),
      ],
    );
    final priorityBadge = StatusBadge(label: taskPriorityLabel(l10n, task.priority), tone: taskPriorityTone(task.priority));

    return Column(
      children: [
        InfoRow(
          icon: Icons.folder_outlined,
          label: l10n.taskProject,
          value: project == null
              ? Text(l10n.taskInbox)
              : EntityLink(
                  label: project.name,
                  semanticLabel: l10n.taskOpenProject(project.name),
                  onTap: () => context.push(ProjectsRoutes.detail(project.id)),
                ),
        ),
        InfoRow(
          icon: Icons.business_outlined,
          label: l10n.taskClient,
          value: clientId == null || clientName == null
              ? Text(l10n.valueNone)
              : EntityLink(
                  label: clientName,
                  semanticLabel: l10n.taskOpenClient(clientName),
                  onTap: () => context.push(ClientsRoutes.detail(clientId)),
                ),
        ),
        InfoRow(
          icon: Icons.person_outline,
          label: l10n.taskAssignee,
          value: canEdit
              ? EditableValue(
                  tooltip: l10n.taskAssigneeChange,
                  onTap: () => showTaskAssigneeSheet(context, ref, task),
                  child: assigneeValue,
                )
              : assigneeValue,
        ),
        InfoRow(
          icon: Icons.flag_outlined,
          label: l10n.taskPriorityLabel,
          value: canEdit
              ? EditableValue(
                  tooltip: l10n.taskPriorityChange,
                  onTap: () => showTaskPrioritySheet(context, ref, task),
                  child: priorityBadge,
                )
              : priorityBadge,
        ),
        InfoRow(
          icon: Icons.event_outlined,
          label: l10n.taskDueDate,
          value: Text(dueDate == null ? l10n.noDueDate : formats.date(dueDate)),
        ),
        InfoRow(
          icon: Icons.schedule,
          label: l10n.taskEstimate,
          value: Text(
            estimate == null || estimate == 0 ? l10n.valueNone : formats.duration(estimate),
            style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()]),
          ),
        ),
        InfoRow(
          icon: Icons.history,
          label: l10n.taskCreatedOn,
          value: Tooltip(message: formats.dateTime(task.createdAt), child: Text(formats.relative(task.createdAt))),
        ),
      ],
    );
  }
}
