import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/formatting/formats.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../approvals/approvals_routes.dart';
import '../../../calendar/calendar_routes.dart';
import '../../../content/content_routes.dart';
import '../../../tasks/tasks_routes.dart';
import '../../application/dashboard_providers.dart';
import '../../domain/dashboard_models.dart';
import '../../domain/dashboard_summaries.dart';
import '../widgets/overview_section.dart';
import '../widgets/status_display.dart';

/// The member's open tasks, most urgent first.
class MyWorkSection extends ConsumerWidget {
  const MyWorkSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<MyWorkSummary>(
      title: l10n.dashboardMyWorkTitle,
      trailing: ViewAllButton(onPressed: () => context.go(TasksRoutes.root)),
      value: ref.watch(myWorkProvider),
      onRetry: () => ref.invalidate(dashboardTasksProvider),
      builder: (context, work) => work.tasks.isEmpty
          ? SectionEmpty(message: l10n.dashboardMyWorkEmpty)
          : OverviewList(children: [for (final task in work.tasks) _TaskRow(task: task)]),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task});

  final WorkTask task;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final dueDate = task.dueDate;
    final due = dueDate == null ? (label: l10n.noDueDate, tone: StatusTone.neutral) : formats.due(dueDate);
    final status = l10n.dashboardTaskStatus(task.status);
    final urgent = task.priority == Priorities.urgent || task.priority == Priorities.high;
    return OverviewRow(
      leading: RowMark(
        icon: urgent ? Icons.priority_high : Icons.radio_button_unchecked,
        color: urgent ? StatusTone.warning.color(context.tokens) : null,
      ),
      title: task.title,
      subtitle: status,
      trailing: StatusBadge(label: due.label, tone: due.tone, dense: true),
      semanticLabel: '${task.title}, $status, ${due.label}',
      onTap: () => context.push(TasksRoutes.detail(task.id)),
    );
  }
}

/// Pending approval requests; content titles are resolved when the member may read content.
class ApprovalsSection extends ConsumerWidget {
  const ApprovalsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final canReadContent = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentView)));
    final content = canReadContent ? ref.watch(dashboardContentProvider).value : null;
    final titles = {for (final item in content ?? const <ContentRef>[]) item.id: item.title};
    return OverviewSection<ApprovalSummary>(
      title: l10n.dashboardApprovalsTitle,
      trailing: ViewAllButton(onPressed: () => context.go(ApprovalsRoutes.root)),
      value: ref.watch(approvalSummaryProvider),
      onRetry: () => ref.invalidate(dashboardApprovalsProvider),
      builder: (context, summary) => summary.pending.isEmpty
          ? SectionEmpty(message: l10n.dashboardApprovalsEmpty)
          : OverviewList(
              children: [
                for (final approval in summary.pending.take(dashboardListLimit))
                  _ApprovalRow(approval: approval, title: titles[approval.subjectId]),
              ],
            ),
    );
  }
}

class _ApprovalRow extends StatelessWidget {
  const _ApprovalRow({required this.approval, this.title});

  final ApprovalRef approval;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final name = title ?? l10n.dashboardApprovalSubject(approval.subjectType);
    final dueAt = approval.dueAt;
    final createdAt = approval.createdAt;
    final badge = dueAt == null
        ? (label: l10n.dashboardApprovalStatus(approval.status), tone: approvalStatusTone(approval.status))
        : formats.due(dueAt);
    final subtitle = approval.stepName ?? (createdAt == null ? null : l10n.dashboardRequested(formats.relative(createdAt)));
    return OverviewRow(
      leading: const RowMark(icon: Icons.fact_check_outlined),
      title: name,
      subtitle: subtitle,
      trailing: StatusBadge(label: badge.label, tone: badge.tone, dense: true),
      semanticLabel: [name, ?subtitle, badge.label].join(', '),
      onTap: () => context.push(ApprovalsRoutes.detail(approval.id)),
    );
  }
}

/// Calendar items and scheduled posts in the coming week.
class UpcomingSection extends ConsumerWidget {
  const UpcomingSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<List<UpcomingItem>>(
      title: l10n.dashboardUpcomingTitle,
      trailing: ViewAllButton(onPressed: () => context.go(CalendarRoutes.root)),
      value: ref.watch(upcomingProvider),
      onRetry: () {
        ref
          ..invalidate(dashboardCalendarProvider)
          ..invalidate(dashboardContentProvider);
      },
      builder: (context, items) => items.isEmpty
          ? SectionEmpty(message: l10n.dashboardUpcomingEmpty(dashboardHorizonDays), icon: Icons.event_available_outlined)
          : OverviewList(children: [for (final item in items.take(dashboardListLimit)) _UpcomingRow(item: item)]),
    );
  }
}

class _UpcomingRow extends StatelessWidget {
  const _UpcomingRow({required this.item});

  final UpcomingItem item;

  String _route() => switch (item.kind) {
        CalendarSourceTypes.content => ContentRoutes.detail(item.sourceId),
        CalendarSourceTypes.task => TasksRoutes.detail(item.sourceId),
        _ => CalendarRoutes.root,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final when = item.allDay ? l10n.dashboardAllDay : formats.time(item.at);
    final subtitle = '${l10n.dashboardUpcomingKind(item.kind)} · $when';
    final route = _route();
    return OverviewRow(
      leading: DateBlock(date: item.at),
      title: item.title,
      subtitle: subtitle,
      semanticLabel: '${item.title}, ${formats.date(item.at)}, $subtitle',
      onTap: () => route == CalendarRoutes.root ? context.go(route) : context.push(route),
    );
  }
}
