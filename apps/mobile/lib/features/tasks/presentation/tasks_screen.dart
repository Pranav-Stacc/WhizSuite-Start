import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/tasks_controller.dart';
import '../domain/task.dart';
import '../domain/task_filters.dart';
import '../tasks_routes.dart';
import 'filter_menu_chip.dart';
import 'task_board.dart';
import 'task_card.dart';
import 'task_forms.dart';
import 'task_status.dart';

enum _TaskView { board, list }

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  _TaskView _view = _TaskView.board;
  TaskFilter _filter = const TaskFilter();

  /// Optimistic status per task id while a drag-and-drop transition is in flight.
  final Map<String, String> _pending = {};

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showTaskForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  void _open(Task task) => context.go(TasksRoutes.detail(task.id));

  Future<void> _move(Task task, String status) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _pending[task.id] = status);
    try {
      await runAction(
        context,
        () async {
          await ref.read(tasksActionsProvider).transition(task.id, status);
          await ref.read(tasksProvider.future);
        },
        success: l10n.taskMovedToast(taskStatusLabel(l10n, status)),
      );
    } finally {
      if (mounted) setState(() => _pending.remove(task.id));
    }
  }

  void _setFilter(TaskFilter next) => setState(() => _filter = next);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final value = ref.watch(tasksProvider);
    final all = value.value;

    return PageScaffold(
      title: l10n.tasksTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.tasksCreate],
        child: CreateFab(label: l10n.taskNew, onPressed: _create),
      ),
      body: switch (all) {
        null when value.hasError => ErrorState(error: value.error ?? '', onRetry: () => ref.invalidate(tasksProvider)),
        null => const SkeletonList(),
        [] => _EmptyTasks(onCreate: _create, onRefresh: () => ref.refresh(tasksProvider.future)),
        final List<Task> tasks => _content(context, applyStatusOverrides(tasks, _pending)),
      },
    );
  }

  Widget _content(BuildContext context, List<Task> tasks) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final userId = ref.watch(sessionProvider).value?.userId;
    final canTransition = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.tasksTransition)));
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final now = DateTime.now();
    final board = _view == _TaskView.board;

    String? clientOf(String projectId) => projects[projectId]?.parentId;
    final unscoped = _filter.copyWith(scope: () => null, status: board ? () => null : null);
    final scoped = [
      for (final task in tasks)
        if (unscoped.matches(task, userId: userId, now: now, clientOf: clientOf)) task,
    ];
    final visible = [
      for (final task in scoped)
        if (matchesScope(task, _filter.scope, userId: userId, now: now)) task,
    ];
    Future<void> refresh() => ref.refresh(tasksProvider.future);
    void statusSheet(Task task) => showTaskStatusSheet(context, ref, task);

    final projectOptions = projects.entries.map((p) => p.id).toList()
      ..sort((a, b) => taskProjectLabel(l10n, projects, clients, a).compareTo(taskProjectLabel(l10n, projects, clients, b)));
    final clientOptions = clients.entries.map((c) => c.id).toList()
      ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));
    final hasMenuFilters =
        _filter.priority != null || _filter.projectId != null || _filter.clientId != null || (!board && _filter.status != null);

    final header = Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: SearchField(
                  hint: l10n.tasksSearch,
                  onChanged: (query) => _setFilter(_filter.copyWith(query: query)),
                ),
              ),
              SizedBox(width: tokens.md),
              SegmentedButton<_TaskView>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(
                    value: _TaskView.board,
                    icon: const Icon(Icons.view_kanban_outlined),
                    tooltip: l10n.taskViewBoard,
                  ),
                  ButtonSegment(value: _TaskView.list, icon: const Icon(Icons.view_list_outlined), tooltip: l10n.taskViewList),
                ],
                selected: {_view},
                onSelectionChanged: (selection) => setState(() => _view = selection.first),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          FilterBar<TaskScope>(
            options: TaskScope.values,
            selected: _filter.scope,
            labelOf: (scope) => taskScopeLabel(l10n, scope),
            countOf: (scope) => scoped.where((t) => matchesScope(t, scope, userId: userId, now: now)).length,
            onSelected: (scope) => _setFilter(_filter.copyWith(scope: () => scope)),
          ),
          SizedBox(height: tokens.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                if (!board) ...[
                  FilterMenuChip<String>(
                    label: l10n.taskFilterStatus,
                    icon: Icons.radio_button_checked,
                    value: _filter.status,
                    options: TaskStatuses.values,
                    labelOf: (s) => taskStatusLabel(l10n, s),
                    onSelected: (s) => _setFilter(_filter.copyWith(status: () => s)),
                  ),
                  SizedBox(width: tokens.sm),
                ],
                FilterMenuChip<String>(
                  label: l10n.taskFilterPriority,
                  icon: Icons.flag_outlined,
                  value: _filter.priority,
                  options: Priorities.values,
                  labelOf: (p) => taskPriorityLabel(l10n, p),
                  onSelected: (p) => _setFilter(_filter.copyWith(priority: () => p)),
                ),
                if (projectOptions.isNotEmpty) ...[
                  SizedBox(width: tokens.sm),
                  FilterMenuChip<String>(
                    label: l10n.taskFilterProject,
                    icon: Icons.folder_outlined,
                    value: _filter.projectId,
                    options: projectOptions,
                    labelOf: (id) => taskProjectLabel(l10n, projects, clients, id),
                    onSelected: (id) => _setFilter(_filter.copyWith(projectId: () => id)),
                  ),
                ],
                if (clientOptions.isNotEmpty) ...[
                  SizedBox(width: tokens.sm),
                  FilterMenuChip<String>(
                    label: l10n.taskFilterClient,
                    icon: Icons.business_outlined,
                    value: _filter.clientId,
                    options: clientOptions,
                    labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
                    onSelected: (id) => _setFilter(_filter.copyWith(clientId: () => id)),
                  ),
                ],
                if (hasMenuFilters) ...[
                  SizedBox(width: tokens.sm),
                  TextButton(
                    onPressed: () => _setFilter(
                      _filter.copyWith(status: () => null, priority: () => null, projectId: () => null, clientId: () => null),
                    ),
                    child: Text(l10n.taskFiltersClear),
                  ),
                ],
              ],
            ),
          ),
          if (board && canTransition)
            LayoutBuilder(
              builder: (context, constraints) => constraints.maxWidth + tokens.lg * 2 >= TaskBoard.wideBreakpoint
                  ? Padding(
                      padding: EdgeInsets.only(top: tokens.sm),
                      child: Row(
                        children: [
                          Icon(Icons.pan_tool_alt_outlined, size: 16, color: tokens.muted),
                          SizedBox(width: tokens.sm),
                          Expanded(
                            child: Text(
                              l10n.taskDragHint,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                            ),
                          ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
        ],
      ),
    );

    final Widget body;
    if (visible.isEmpty) {
      body = RefreshIndicator(
        onRefresh: refresh,
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(
              height: constraints.maxHeight,
              child: EmptyState(
                icon: Icons.search_off,
                title: l10n.searchNoMatches,
                body: l10n.searchNoMatchesBody,
                action: hasMenuFilters || _filter.scope != null
                    ? OutlinedButton(
                        onPressed: () => _setFilter(TaskFilter(query: _filter.query)),
                        child: Text(l10n.taskFiltersClear),
                      )
                    : null,
              ),
            ),
          ),
        ),
      );
    } else if (board) {
      body = TaskBoard(
        tasks: visible,
        onOpen: _open,
        onRefresh: refresh,
        onMove: canTransition ? _move : null,
        onStatusTap: canTransition ? statusSheet : null,
      );
    } else {
      final sorted = [...visible]..sort(compareByDue);
      body = RefreshIndicator(
        onRefresh: refresh,
        child: LayoutBuilder(
          builder: (context, constraints) {
            const minTileWidth = 320.0;
            const tileHeight = 148.0;
            final columns = gridColumns(constraints.maxWidth - tokens.lg * 2, minTileWidth: minTileWidth);
            final padding = EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.xxl * 2);
            Widget card(int index) {
              final task = sorted[index];
              return FadeSlideIn(
                index: index,
                child: TaskCard(
                  task: task,
                  showStatus: true,
                  onTap: () => _open(task),
                  onStatusTap: canTransition ? () => statusSheet(task) : null,
                ),
              );
            }

            if (columns == 1) {
              return ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: padding,
                itemCount: sorted.length,
                separatorBuilder: (_, _) => SizedBox(height: tokens.md),
                itemBuilder: (context, index) => card(index),
              );
            }
            return GridView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: padding,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisSpacing: tokens.md,
                crossAxisSpacing: tokens.md,
                mainAxisExtent: tileHeight,
              ),
              itemCount: sorted.length,
              itemBuilder: (context, index) => card(index),
            );
          },
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [header, Expanded(child: body)],
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  const _EmptyTasks({required this.onCreate, required this.onRefresh});

  final VoidCallback onCreate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: constraints.maxHeight,
            child: EmptyState(
              icon: Icons.task_alt_outlined,
              title: l10n.tasksEmpty,
              body: l10n.tasksEmptyBody,
              action: PermissionGate(
                anyOf: const [Permissions.tasksCreate],
                child: FilledButton.icon(onPressed: onCreate, icon: const Icon(Icons.add), label: Text(l10n.taskNew)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
