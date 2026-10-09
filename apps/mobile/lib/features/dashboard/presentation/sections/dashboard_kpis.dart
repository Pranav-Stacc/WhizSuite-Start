import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/formatting/formats.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../approvals/approvals_routes.dart';
import '../../../clients/clients_routes.dart';
import '../../../content/content_routes.dart';
import '../../../invoices/invoices_routes.dart';
import '../../../tasks/tasks_routes.dart';
import '../../application/dashboard_providers.dart';
import '../../domain/dashboard_summaries.dart';
import '../widgets/overview_layout.dart';

/// Permissions that unlock at least one KPI tile.
const List<String> dashboardKpiPermissions = [
  Permissions.tasksView,
  Permissions.contentView,
  Permissions.approvalsView,
  Permissions.invoicesView,
  Permissions.clientsView,
];

/// Key metrics, each tile gated by the permission of the endpoint it summarises.
class DashboardKpis extends ConsumerWidget {
  const DashboardKpis({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final policy = ref.watch(accessPolicyProvider);
    return MetricGrid(
      semanticLabel: l10n.dashboardKpiAria,
      tiles: [
        if (policy.can(Permissions.tasksView)) ...const [_MyTasksTile(), _DueTile()],
        if (policy.can(Permissions.contentView)) const _InReviewTile(),
        if (policy.can(Permissions.approvalsView)) const _ApprovalsTile(),
        if (policy.can(Permissions.invoicesView)) const _OutstandingTile(),
        if (policy.can(Permissions.clientsView)) const _ClientsTile(),
      ],
    );
  }
}

typedef _Shown = ({String value, String? caption, StatusTone tone});

class _MyTasksTile extends ConsumerWidget {
  const _MyTasksTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<MyWorkSummary>(
      label: l10n.dashboardKpiMyTasks,
      icon: Icons.check_circle_outline,
      value: ref.watch(myWorkProvider),
      onRetry: () => ref.invalidate(dashboardTasksProvider),
      onTap: () => context.go(TasksRoutes.root),
      present: (work) => (
        value: formats.number(work.open),
        caption: l10n.dashboardKpiMyTasksCaption(work.dueThisWeek),
        tone: StatusTone.neutral,
      ),
    );
  }
}

class _DueTile extends ConsumerWidget {
  const _DueTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<MyWorkSummary>(
      label: l10n.dashboardKpiDue,
      icon: Icons.event_busy_outlined,
      value: ref.watch(myWorkProvider),
      onRetry: () => ref.invalidate(dashboardTasksProvider),
      onTap: () => context.go(TasksRoutes.root),
      present: (work) => (
        value: formats.number(work.urgent),
        caption: l10n.dashboardKpiDueCaption(work.overdue),
        tone: work.overdue > 0
            ? StatusTone.danger
            : work.dueToday > 0
                ? StatusTone.warning
                : StatusTone.neutral,
      ),
    );
  }
}

class _InReviewTile extends ConsumerWidget {
  const _InReviewTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<ContentSummary>(
      label: l10n.dashboardKpiInReview,
      icon: Icons.rate_review_outlined,
      value: ref.watch(contentSummaryProvider),
      onRetry: () => ref.invalidate(dashboardContentProvider),
      onTap: () => context.go(ContentRoutes.root),
      present: (content) => (
        value: formats.number(content.inReview),
        caption: l10n.dashboardKpiInReviewCaption(content.changesRequested),
        tone: content.changesRequested > 0 ? StatusTone.warning : StatusTone.neutral,
      ),
    );
  }
}

class _ApprovalsTile extends ConsumerWidget {
  const _ApprovalsTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<ApprovalSummary>(
      label: l10n.dashboardKpiApprovals,
      icon: Icons.hourglass_bottom,
      value: ref.watch(approvalSummaryProvider),
      onRetry: () => ref.invalidate(dashboardApprovalsProvider),
      onTap: () => context.go(ApprovalsRoutes.root),
      present: (approvals) => (
        value: formats.number(approvals.pending.length),
        caption: l10n.dashboardKpiApprovalsCaption(approvals.overdue),
        tone: approvals.overdue > 0 ? StatusTone.danger : StatusTone.neutral,
      ),
    );
  }
}

class _OutstandingTile extends ConsumerWidget {
  const _OutstandingTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<ReceivablesSummary>(
      label: l10n.dashboardKpiOutstanding,
      icon: Icons.payments_outlined,
      value: ref.watch(receivablesProvider),
      onRetry: () => ref.invalidate(dashboardInvoicesProvider),
      onTap: () => context.go(InvoicesRoutes.root),
      present: (receivables) {
        final money = formats.money(receivables.outstandingMinor, currency: receivables.currency, compact: true);
        final _Shown shown = receivables.overdueMinor > 0
            ? (
                value: money,
                caption: l10n.dashboardKpiOutstandingCaption(
                  formats.money(receivables.overdueMinor, currency: receivables.currency, compact: true),
                ),
                tone: StatusTone.danger,
              )
            : (value: money, caption: l10n.dashboardKpiOutstandingClear, tone: StatusTone.neutral);
        return shown;
      },
    );
  }
}

class _ClientsTile extends ConsumerWidget {
  const _ClientsTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    return AsyncMetricTile<ClientSummary>(
      label: l10n.dashboardKpiClients,
      icon: Icons.business_outlined,
      value: ref.watch(clientSummaryProvider),
      onRetry: () => ref.invalidate(dashboardClientsProvider),
      onTap: () => context.go(ClientsRoutes.root),
      present: (clients) => (
        value: formats.number(clients.active),
        caption: l10n.dashboardKpiClientsCaption(clients.onboarding),
        tone: StatusTone.neutral,
      ),
    );
  }
}
