import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../domain/task.dart';
import 'task_status.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Board and list card: title, client · project, priority, due, estimate and assignee.
class TaskCard extends ConsumerWidget {
  const TaskCard({required this.task, required this.onTap, this.onStatusTap, this.showStatus = false, super.key});

  static const _avatarSize = 26.0;
  static const _dotSize = 8.0;
  static const _metaIconSize = 14.0;

  final Task task;
  final VoidCallback onTap;

  /// Opens the status sheet; null hides the button (no permission, or drag-and-drop is available).
  final VoidCallback? onStatusTap;
  final bool showStatus;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;

    final project = projects[task.projectId];
    final clientId = project?.parentId;
    final where = [clients.nameOf(clientId), project?.name].whereType<String>().join(' · ');
    final assignee = members.nameOf(task.assigneeUserId);
    final dueDate = task.dueDate;
    final due = dueDate == null ? null : formats.due(dueDate, done: task.isDone);
    final estimate = task.estimateMinutes;
    final statusLabel = taskStatusLabel(l10n, task.status);
    final priorityLabel = taskPriorityLabel(l10n, task.priority);

    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.all(tokens.md),
      semanticLabel: [
        task.title,
        statusLabel,
        priorityLabel,
        if (where.isNotEmpty) where,
        due?.label ?? l10n.noDueDate,
        assignee == null ? l10n.unassigned : l10n.taskAssignedTo(assignee),
      ].join(', '),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  task.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: text.titleSmall?.copyWith(
                    decoration: task.isDone ? TextDecoration.lineThrough : null,
                    color: task.isDone ? tokens.muted : null,
                  ),
                ),
              ),
              if (onStatusTap != null)
                Padding(
                  padding: EdgeInsetsDirectional.only(start: tokens.xs),
                  child: IconButton(
                    tooltip: l10n.taskStatusChange,
                    icon: const Icon(Icons.swap_horiz, size: 20),
                    onPressed: onStatusTap,
                  ),
                ),
            ],
          ),
          if (where.isNotEmpty) ...[
            SizedBox(height: tokens.xs),
            Row(
              children: [
                Container(
                  width: _dotSize,
                  height: _dotSize,
                  decoration: BoxDecoration(
                    color: clientId == null ? tokens.muted : seedColor(clientId),
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: tokens.sm),
                Expanded(
                  child: Text(
                    where,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: tokens.muted),
                  ),
                ),
              ],
            ),
          ],
          SizedBox(height: tokens.md),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: tokens.xs + 2,
                  runSpacing: tokens.xs,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (showStatus) StatusBadge(label: statusLabel, tone: taskStatusTone(task.status), dense: true),
                    StatusBadge(label: priorityLabel, tone: taskPriorityTone(task.priority), dense: true),
                    if (due != null) StatusBadge(label: due.label, tone: due.tone, dense: true),
                    if (estimate != null && estimate > 0)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.schedule, size: _metaIconSize, color: tokens.muted),
                          SizedBox(width: tokens.xs),
                          Text(
                            formats.duration(estimate),
                            style: text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: _tabular),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              SizedBox(width: tokens.sm),
              Tooltip(
                message: assignee == null ? l10n.unassigned : l10n.taskAssignedTo(assignee),
                child: assignee == null
                    ? Container(
                        width: _avatarSize,
                        height: _avatarSize,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: tokens.border),
                        ),
                        child: Icon(Icons.person_outline, size: _metaIconSize, color: tokens.muted),
                      )
                    : InitialsAvatar(name: assignee, seed: task.assigneeUserId, size: _avatarSize),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
