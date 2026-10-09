import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/task.dart';
import '../domain/task_filters.dart';
import 'task_card.dart';
import 'task_status.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Kanban board with one column per task status. Wide layouts show every column side by side
/// with drag-and-drop between them; phones page through columns with tabs.
class TaskBoard extends StatelessWidget {
  const TaskBoard({
    required this.tasks,
    required this.onOpen,
    required this.onRefresh,
    this.onMove,
    this.onStatusTap,
    super.key,
  });

  static const wideBreakpoint = 840.0;

  final List<Task> tasks;
  final ValueChanged<Task> onOpen;
  final Future<void> Function() onRefresh;

  /// Moves a task to another column; null when the member may not transition tasks.
  final void Function(Task task, String status)? onMove;

  /// Opens the status sheet on phones; null when the member may not transition tasks.
  final ValueChanged<Task>? onStatusTap;

  @override
  Widget build(BuildContext context) {
    final columns = groupByStatus(tasks);
    return LayoutBuilder(
      builder: (context, constraints) => constraints.maxWidth >= wideBreakpoint
          ? _WideBoard(columns: columns, onOpen: onOpen, onRefresh: onRefresh, onMove: onMove)
          : _PagedBoard(columns: columns, onOpen: onOpen, onRefresh: onRefresh, onStatusTap: onStatusTap),
    );
  }
}

class _WideBoard extends StatelessWidget {
  const _WideBoard({required this.columns, required this.onOpen, required this.onRefresh, this.onMove});

  static const _minColumnWidth = 260.0;

  final Map<String, List<Task>> columns;
  final ValueChanged<Task> onOpen;
  final Future<void> Function() onRefresh;
  final void Function(Task task, String status)? onMove;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, constraints) {
        final gap = tokens.md;
        final count = columns.length;
        final available = constraints.maxWidth - tokens.lg * 2;
        final width = math.max(_minColumnWidth, (available - gap * (count - 1)) / count);
        final padding = EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.lg);
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: padding,
          child: SizedBox(
            height: math.max(0, constraints.maxHeight - padding.vertical),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, entry) in columns.entries.indexed) ...[
                  if (i > 0) SizedBox(width: gap),
                  SizedBox(
                    width: width,
                    child: _DropColumn(
                      status: entry.key,
                      tasks: entry.value,
                      cardWidth: width - tokens.sm * 2,
                      onOpen: onOpen,
                      onRefresh: onRefresh,
                      onMove: onMove,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DropColumn extends StatelessWidget {
  const _DropColumn({
    required this.status,
    required this.tasks,
    required this.cardWidth,
    required this.onOpen,
    required this.onRefresh,
    this.onMove,
  });

  static const _activeFillAlpha = 0.08;
  static const _draggingOpacity = 0.35;
  static const _feedbackElevation = 8.0;

  final String status;
  final List<Task> tasks;
  final double cardWidth;
  final ValueChanged<Task> onOpen;
  final Future<void> Function() onRefresh;
  final void Function(Task task, String status)? onMove;

  Widget _card(BuildContext context, Task task) {
    final l10n = AppLocalizations.of(context);
    final move = onMove;
    final card = TaskCard(task: task, onTap: () => onOpen(task));
    if (move == null) return card;
    return Semantics(
      customSemanticsActions: {
        for (final target in TaskStatuses.values)
          if (target != task.status)
            CustomSemanticsAction(label: l10n.taskMovedToast(taskStatusLabel(l10n, target))): () => move(task, target),
      },
      child: LongPressDraggable<Task>(
        data: task,
        feedback: Material(
          type: MaterialType.transparency,
          elevation: _feedbackElevation,
          child: SizedBox(width: cardWidth, child: card),
        ),
        childWhenDragging: Opacity(opacity: _draggingOpacity, child: card),
        child: card,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final tone = taskStatusTone(status).color(tokens);
    final move = onMove;
    return DragTarget<Task>(
      onWillAcceptWithDetails: (details) => move != null && details.data.status != status,
      onAcceptWithDetails: (details) => move?.call(details.data, status),
      builder: (context, candidates, _) {
        final active = candidates.isNotEmpty;
        return AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.standard,
          decoration: BoxDecoration(
            color: active ? tone.withValues(alpha: _activeFillAlpha) : tokens.subtle,
            borderRadius: BorderRadius.circular(tokens.radius + 6),
            border: Border.all(color: active ? tone : tokens.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _ColumnHeader(status: status, tasks: tasks),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: onRefresh,
                  child: tasks.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: EdgeInsets.all(tokens.lg),
                          children: [
                            Text(
                              active ? l10n.taskColumnDrop : l10n.taskColumnEmpty,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: tokens.muted),
                            ),
                          ],
                        )
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: EdgeInsets.fromLTRB(tokens.sm, 0, tokens.sm, tokens.sm),
                          itemCount: tasks.length,
                          separatorBuilder: (_, _) => SizedBox(height: tokens.sm),
                          itemBuilder: (context, index) =>
                              FadeSlideIn(index: index, child: _card(context, tasks[index])),
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ColumnHeader extends StatelessWidget {
  const _ColumnHeader({required this.status, required this.tasks});

  static const _barHeight = 3.0;

  final String status;
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final text = Theme.of(context).textTheme;
    final label = taskStatusLabel(l10n, status);
    final tone = taskStatusTone(status).color(tokens);
    final estimate = totalEstimateMinutes(tasks);
    return Semantics(
      header: true,
      label: l10n.taskColumnSemantics(label, tasks.length),
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: _barHeight,
            margin: EdgeInsets.symmetric(horizontal: tokens.lg),
            decoration: BoxDecoration(
              color: tone,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(_barHeight)),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.sm),
            child: Row(
              children: [
                Expanded(child: Text(label, style: text.titleSmall, overflow: TextOverflow.ellipsis)),
                if (estimate > 0) ...[
                  Text(
                    context.formats.duration(estimate),
                    style: text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: _tabular),
                  ),
                  SizedBox(width: tokens.sm),
                ],
                CountPill(count: tasks.length),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Small rounded count used in column headers and tabs.
class CountPill extends StatelessWidget {
  const CountPill({required this.count, super.key});

  final int count;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 1),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(tokens.radius + 999),
        border: Border.all(color: tokens.border),
      ),
      child: Text(
        '$count',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(fontFeatures: _tabular),
      ),
    );
  }
}

class _PagedBoard extends StatelessWidget {
  const _PagedBoard({required this.columns, required this.onOpen, required this.onRefresh, this.onStatusTap});

  static const _dotSize = 8.0;

  final Map<String, List<Task>> columns;
  final ValueChanged<Task> onOpen;
  final Future<void> Function() onRefresh;
  final ValueChanged<Task>? onStatusTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final statusTap = onStatusTap;
    return DefaultTabController(
      length: columns.length,
      child: Column(
        children: [
          TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              for (final entry in columns.entries)
                Tab(
                  child: Semantics(
                    label: l10n.taskColumnSemantics(taskStatusLabel(l10n, entry.key), entry.value.length),
                    excludeSemantics: true,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: _dotSize,
                          height: _dotSize,
                          decoration: BoxDecoration(
                            color: taskStatusTone(entry.key).color(tokens),
                            shape: BoxShape.circle,
                          ),
                        ),
                        SizedBox(width: tokens.sm),
                        Text(taskStatusLabel(l10n, entry.key)),
                        SizedBox(width: tokens.sm),
                        CountPill(count: entry.value.length),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [
                for (final entry in columns.entries)
                  RefreshIndicator(
                    onRefresh: onRefresh,
                    child: entry.value.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: EdgeInsets.all(tokens.xxl),
                            children: [
                              Text(l10n.taskColumnEmpty, textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
                            ],
                          )
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.xxl * 2),
                            itemCount: entry.value.length,
                            separatorBuilder: (_, _) => SizedBox(height: tokens.md),
                            itemBuilder: (context, index) {
                              final task = entry.value[index];
                              return FadeSlideIn(
                                index: index,
                                child: TaskCard(
                                  task: task,
                                  onTap: () => onOpen(task),
                                  onStatusTap: statusTap == null ? null : () => statusTap(task),
                                ),
                              );
                            },
                          ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
