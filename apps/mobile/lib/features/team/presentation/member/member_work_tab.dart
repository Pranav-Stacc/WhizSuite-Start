import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../tasks/application/tasks_controller.dart';
import '../../../tasks/domain/task.dart';
import '../../../tasks/presentation/task_status.dart';
import '../../../tasks/tasks_routes.dart';
import '../../domain/member.dart';

class MemberWorkTab extends ConsumerWidget {
  const MemberWorkTab({required this.member, super.key});

  final Member member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final tasks = ref.watch(tasksProvider);
    return tasks.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(error: e, onRetry: () => ref.invalidate(tasksProvider)),
      data: (all) {
        final assigned = all.where((t) => t.assigneeUserIds.contains(member.userId)).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        if (assigned.isEmpty) {
          return EmptyState(icon: Icons.task_alt_outlined, title: l10n.memberWorkEmpty);
        }
        return ListView.separated(
          padding: EdgeInsets.all(tokens.lg),
          itemCount: assigned.length,
          separatorBuilder: (_, _) => Divider(height: 1, color: tokens.border),
          itemBuilder: (context, i) => _TaskTile(task: assigned[i]),
        );
      },
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task});

  final Task task;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(task.title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: Text(taskStatusLabel(l10n, task.status), style: TextStyle(color: tokens.muted)),
      trailing: task.dueDate == null ? null : Icon(Icons.event_outlined, size: 18, color: tokens.muted),
      onTap: () => context.push(TasksRoutes.detail(task.id)),
    );
  }
}
