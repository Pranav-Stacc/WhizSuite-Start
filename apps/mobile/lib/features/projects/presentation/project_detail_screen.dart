import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../clients/clients_routes.dart';
import '../../content/content_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../../tasks/application/tasks_controller.dart';
import '../../tasks/domain/task.dart';
import '../../tasks/domain/task_filters.dart';
import '../../tasks/presentation/entity_link.dart';
import '../../tasks/presentation/task_forms.dart';
import '../../tasks/presentation/task_status.dart';
import '../../tasks/tasks_routes.dart';
import '../../time/time_routes.dart';
import '../application/projects_controller.dart';
import '../domain/project.dart';
import 'project_forms.dart';
import 'project_status.dart';

const _tabular = [FontFeature.tabularFigures()];

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({required this.projectId, super.key});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final project = ref.watch(projectProvider(projectId));
    final loaded = project.value;

    return PageScaffold(
      title: loaded?.name ?? l10n.projectsTitle,
      actions: [
        if (loaded != null)
          PermissionGate(
            anyOf: const [Permissions.projectsCreate],
            child: IconButton(
              tooltip: l10n.projectEdit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                final saved = await showProjectForm(context, ref, project: loaded);
                if (saved != null && context.mounted) showToast(context, l10n.savedToast);
              },
            ),
          ),
      ],
      body: AsyncValueView<Project>(
        value: project,
        onRetry: () => ref.invalidate(projectProvider(projectId)),
        data: (project) => _ProjectBody(project: project),
      ),
    );
  }
}

class _ProjectBody extends ConsumerWidget {
  const _ProjectBody({required this.project});

  static const _wideBreakpoint = 720.0;
  static const _minMetricWidth = 180.0;
  static const _maxMetricColumns = 4;

  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final clientName = clients.nameOf(project.clientId);
    final canSeeTasks = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.tasksView)));
    final tasks = canSeeTasks
        ? ref.watch(tasksForProjectProvider(project.id))
        : const AsyncValue<List<Task>>.data(<Task>[]);
    final logged = ref.watch(projectLoggedMinutesProvider(project.id)).value;
    final budget = project.budgetMinor;
    final end = project.endDate;
    final due = end == null ? null : formats.due(end, done: project.isCompleted);

    Future<void> refresh() {
      ref
        ..invalidate(tasksForProjectProvider(project.id))
        ..invalidate(projectLoggedMinutesProvider(project.id))
        ..invalidate(projectClientContentProvider(project.clientId));
      return ref.refresh(projectProvider(project.id).future);
    }

    final loadedTasks = tasks.value;
    final progress = loadedTasks == null ? null : ProjectProgress.of(loadedTasks);
    final metrics = [
      if (canSeeTasks)
        MetricTile(
          label: l10n.projectProgressLabel,
          icon: Icons.check_circle_outline,
          value: progress == null ? l10n.valueUnknown : formats.percent(progress.ratio),
          caption: progress == null || progress.total == 0 ? l10n.projectNoTasks : l10n.projectProgress(progress.done, progress.total),
          tone: progress != null && progress.total > 0 && progress.done == progress.total ? StatusTone.success : StatusTone.neutral,
        ),
      if (logged != null)
        MetricTile(
          label: l10n.projectLogged,
          icon: Icons.timer_outlined,
          value: formats.duration(logged),
          onTap: () => context.push(TimeRoutes.root),
        ),
      MetricTile(
        label: l10n.projectBudget,
        icon: Icons.account_balance_wallet_outlined,
        value: budget == null || budget == 0 ? l10n.projectNoBudget : formats.money(budget, currency: project.currency),
      ),
      MetricTile(
        label: l10n.projectTimeline,
        icon: Icons.event_outlined,
        value: end == null ? l10n.projectNoEnd : formats.date(end),
        caption: due?.label,
        tone: due?.tone ?? StatusTone.neutral,
      ),
    ];

    final header = FadeSlideIn(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              InitialsAvatar(name: clientName ?? project.name, seed: project.clientId, mark: true, size: 28),
              SizedBox(width: tokens.sm),
              Flexible(
                child: clientName == null
                    ? Text(l10n.valueUnknown, style: TextStyle(color: tokens.muted))
                    : EntityLink(
                        label: clientName,
                        semanticLabel: l10n.projectOpenClient(clientName),
                        onTap: () => context.push(ClientsRoutes.detail(project.clientId)),
                      ),
              ),
              if (project.type != null) ...[
                Text('  ·  ', style: TextStyle(color: tokens.muted)),
                Flexible(child: Text(project.type ?? '', overflow: TextOverflow.ellipsis, style: TextStyle(color: tokens.muted))),
              ],
            ],
          ),
          SizedBox(height: tokens.xs),
          Row(
            children: [
              Expanded(child: Semantics(header: true, child: Text(project.name, style: text.headlineSmall))),
              SizedBox(width: tokens.md),
              _StatusMenu(project: project),
            ],
          ),
        ],
      ),
    );

    final metricGrid = FadeSlideIn(
      index: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = gridColumns(constraints.maxWidth, minTileWidth: _minMetricWidth, max: _maxMetricColumns);
          final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
          return Wrap(
            spacing: tokens.md,
            runSpacing: tokens.md,
            children: [for (final tile in metrics) SizedBox(width: width, child: tile)],
          );
        },
      ),
    );

    final tasksSection = _ProjectTasks(project: project, tasks: tasks);
    final side = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ProjectFacts(project: project),
        _ProjectContent(clientId: project.clientId),
      ],
    );

    return ReadableBody(
      onRefresh: refresh,
      children: [
        header,
        SizedBox(height: tokens.xl),
        metricGrid,
        SizedBox(height: tokens.xl),
        FadeSlideIn(
          index: 2,
          child: LayoutBuilder(
            builder: (context, constraints) => constraints.maxWidth < _wideBreakpoint
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [if (canSeeTasks) ...[tasksSection, SizedBox(height: tokens.xl)], side],
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (canSeeTasks) ...[Expanded(flex: 3, child: tasksSection), SizedBox(width: tokens.xl)],
                      Expanded(flex: 2, child: side),
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}

class _StatusMenu extends ConsumerWidget {
  const _StatusMenu({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final badge = StatusBadge(label: projectStatusLabel(l10n, project.status), tone: projectStatusTone(project.status));
    return PermissionGate(
      anyOf: const [Permissions.projectsCreate],
      fallback: badge,
      child: PopupMenuButton<String>(
        tooltip: l10n.projectStatusChange,
        onSelected: (status) => runAction(
          context,
          () => ref.read(projectsActionsProvider).setStatus(project.id, status),
          success: l10n.savedToast,
        ),
        itemBuilder: (_) => [
          for (final status in ProjectStatuses.values)
            CheckedPopupMenuItem(
              value: status,
              checked: status == project.status,
              child: Text(projectStatusLabel(l10n, status)),
            ),
        ],
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
          child: Row(mainAxisSize: MainAxisSize.min, children: [badge, const Icon(Icons.arrow_drop_down)]),
        ),
      ),
    );
  }
}

/// Loading / error / data for a section nested inside a scrolling page (no own scroll view).
class _InlineAsync<T> extends StatelessWidget {
  const _InlineAsync({required this.value, required this.data, required this.onRetry});

  static const _skeletonRows = 3;

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final current = value.value;
    if (current != null) return data(current);
    if (value.hasError) {
      return Row(
        children: [
          Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 18),
          SizedBox(width: tokens.sm),
          Expanded(child: Text(describeError(l10n, value.error ?? ''))),
          TextButton(onPressed: onRetry, child: Text(l10n.retry)),
        ],
      );
    }
    return Shimmer(
      child: Column(
        children: [
          for (var i = 0; i < _skeletonRows; i++)
            Padding(padding: EdgeInsets.symmetric(vertical: tokens.sm), child: const SkeletonBox(height: 18)),
        ],
      ),
    );
  }
}

class _ProjectTasks extends ConsumerWidget {
  const _ProjectTasks({required this.project, required this.tasks});

  final Project project;
  final AsyncValue<List<Task>> tasks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    return SectionCard(
      title: l10n.projectTasks,
      trailing: PermissionGate(
        anyOf: const [Permissions.tasksCreate],
        child: TextButton.icon(
          onPressed: () async {
            final created = await showTaskForm(context, ref, projectId: project.id);
            if (created && context.mounted) showToast(context, l10n.createdToast);
          },
          icon: const Icon(Icons.add, size: 18),
          label: Text(l10n.projectAddTask),
        ),
      ),
      child: _InlineAsync<List<Task>>(
        value: tasks,
        onRetry: () => ref.invalidate(tasksForProjectProvider(project.id)),
        data: (tasks) {
          final progress = ProjectProgress.of(tasks);
          final sorted = [...tasks]
            ..sort((a, b) => a.isDone == b.isDone ? compareByDue(a, b) : (a.isDone ? 1 : -1));
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      progress.total == 0 ? l10n.projectNoTasks : l10n.projectProgress(progress.done, progress.total),
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                  ),
                  Text(formats.percent(progress.ratio), style: text.labelMedium?.copyWith(fontFeatures: _tabular)),
                ],
              ),
              SizedBox(height: tokens.sm),
              ProgressMeter(
                value: progress.ratio,
                label: l10n.projectProgressLabel,
                tone: progress.total > 0 && progress.done == progress.total ? StatusTone.success : StatusTone.neutral,
              ),
              SizedBox(height: tokens.md),
              if (sorted.isEmpty)
                Padding(
                  padding: EdgeInsets.symmetric(vertical: tokens.md),
                  child: Text(l10n.projectTasksEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted)),
                )
              else
                for (final (i, task) in sorted.indexed) ...[
                  if (i > 0) const Divider(height: 1),
                  _TaskRow(task: task),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _TaskRow extends ConsumerWidget {
  const _TaskRow({required this.task});

  static const _avatarSize = 22.0;

  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final assignee = members.nameOf(task.assigneeUserId);
    final dueDate = task.dueDate;
    final due = dueDate == null ? null : formats.due(dueDate, done: task.isDone);
    return Semantics(
      button: true,
      label: [l10n.projectOpenTask(task.title), taskStatusLabel(l10n, task.status), ?due?.label].join(', '),
      excludeSemantics: true,
      child: InkWell(
        onTap: () => context.push(TasksRoutes.detail(task.id)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: kMinInteractiveDimension + 4),
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.sm),
            child: Row(
              children: [
                StatusBadge(label: taskStatusLabel(l10n, task.status), tone: taskStatusTone(task.status), dense: true),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Text(
                    task.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      decoration: task.isDone ? TextDecoration.lineThrough : null,
                      color: task.isDone ? tokens.muted : null,
                    ),
                  ),
                ),
                if (due != null) ...[SizedBox(width: tokens.sm), StatusBadge(label: due.label, tone: due.tone, dense: true)],
                if (assignee != null) ...[
                  SizedBox(width: tokens.sm),
                  InitialsAvatar(name: assignee, seed: task.assigneeUserId, size: _avatarSize),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProjectFacts extends ConsumerWidget {
  const _ProjectFacts({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final clientName = clients.nameOf(project.clientId);
    final owner = members.nameOf(project.ownerUserId);
    final start = project.startDate;
    final end = project.endDate;
    final budget = project.budgetMinor;
    return SectionCard(
      title: l10n.projectFacts,
      child: Column(
        children: [
          InfoRow(
            icon: Icons.business_outlined,
            label: l10n.projectClient,
            value: clientName == null
                ? Text(l10n.valueUnknown)
                : EntityLink(
                    label: clientName,
                    semanticLabel: l10n.projectOpenClient(clientName),
                    onTap: () => context.push(ClientsRoutes.detail(project.clientId)),
                  ),
          ),
          InfoRow(
            icon: Icons.person_outline,
            label: l10n.projectOwner,
            value: owner == null
                ? Text(l10n.valueNone)
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InitialsAvatar(name: owner, seed: project.ownerUserId, size: 22),
                      SizedBox(width: tokens.sm),
                      Flexible(child: Text(owner, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
          ),
          InfoRow(icon: Icons.category_outlined, label: l10n.projectType, value: Text(project.type ?? l10n.valueNone)),
          InfoRow(
            icon: Icons.play_circle_outline,
            label: l10n.projectStartDate,
            value: Text(start == null ? l10n.valueNone : formats.date(start)),
          ),
          InfoRow(
            icon: Icons.flag_outlined,
            label: l10n.projectEndDate,
            value: Text(end == null ? l10n.projectNoEnd : formats.date(end)),
          ),
          InfoRow(
            icon: Icons.account_balance_wallet_outlined,
            label: l10n.projectBudget,
            value: Text(
              budget == null || budget == 0 ? l10n.projectNoBudget : formats.money(budget, currency: project.currency),
              style: const TextStyle(fontFeatures: _tabular),
            ),
          ),
          InfoRow(
            icon: Icons.history,
            label: l10n.projectCreatedOn,
            value: Text(formats.date(project.createdAt)),
          ),
        ],
      ),
    );
  }
}

class _ProjectContent extends ConsumerWidget {
  const _ProjectContent({required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final content = ref.watch(projectClientContentProvider(clientId));
    if (content.hasValue && content.value == null) return const SizedBox.shrink();
    return Padding(
      padding: EdgeInsets.only(top: tokens.xl),
      child: SectionCard(
        title: l10n.projectContent,
        child: _InlineAsync<List<ProjectContentItem>?>(
          value: content,
          onRetry: () => ref.invalidate(projectClientContentProvider(clientId)),
          data: (items) {
            final list = items ?? const <ProjectContentItem>[];
            if (list.isEmpty) {
              return Text(l10n.projectContentEmpty, style: TextStyle(color: tokens.muted));
            }
            return Column(
              children: [
                for (final (i, item) in list.indexed) ...[
                  if (i > 0) const Divider(height: 1),
                  InkWell(
                    onTap: () => context.push(ContentRoutes.detail(item.id)),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: kMinInteractiveDimension),
                      child: Row(
                        children: [
                          Expanded(child: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
                          SizedBox(width: tokens.sm),
                          StatusBadge(
                            label: l10n.projectContentStatus(item.status),
                            tone: projectContentTone(item.status),
                            dense: true,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
