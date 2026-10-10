import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart' show ReadableBody;
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../approvals/approvals_routes.dart';
import '../../calendar/calendar_routes.dart';
import '../../content/content_routes.dart';
import '../../invoices/invoices_routes.dart';
import '../../tasks/tasks_routes.dart';
import '../application/dashboard_providers.dart';
import '../domain/dashboard_models.dart';
import '../domain/dashboard_summaries.dart';
import 'sections/dashboard_header.dart';
import 'sections/dashboard_kpis.dart';
import 'widgets/overview_section.dart';
import 'widgets/status_display.dart';

/// Creative-agency home desk: masthead, pulse metrics, action feed, horizon, create pad.
class HomeCommandBoard extends ConsumerWidget {
  const HomeCommandBoard({required this.onRefresh, super.key});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final kpiTiles = dashboardKpiTiles(policy);
    final hasKpis = kpiTiles.isNotEmpty;
    final focus = ref.watch(dashboardFocusProvider);
    final canTasks = policy.can(Permissions.tasksView);
    final canApprovals = policy.can(Permissions.approvalsView);
    final canContent = policy.can(Permissions.contentView);
    final canInvoices = policy.can(Permissions.invoicesView);
    final canUpcoming = policy.canAny(const [Permissions.projectsView, Permissions.contentView]);
    final showNowDesk = canTasks ||
        canApprovals ||
        (canContent && focus.contentWaiting > 0) ||
        (canInvoices && focus.outstandingMinor > 0);
    final hasDesk = showNowDesk || canUpcoming;
    final bare = !hasKpis && !hasDesk;
    final showAttention = focus.ready && focus.attentionCount > 0;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.xxl * 2),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Masthead(),
                  if (showAttention) ...[
                    SizedBox(height: tokens.md),
                    _AttentionStrip(
                      focus: focus,
                      canTasks: canTasks,
                      canApprovals: canApprovals,
                      canContent: canContent,
                      canInvoices: canInvoices,
                    ),
                  ],
                  if (hasKpis) ...[
                    SizedBox(height: tokens.lg),
                    _PulseBento(tiles: kpiTiles, label: l10n.dashboardKpiAria),
                  ],
                  if (showNowDesk) ...[
                    SizedBox(height: tokens.lg),
                    _NowDesk(
                      focus: focus,
                      canTasks: canTasks,
                      canApprovals: canApprovals,
                      canContent: canContent,
                      canInvoices: canInvoices,
                    ),
                  ],
                  if (canUpcoming) ...[
                    SizedBox(height: tokens.lg),
                    const _HorizonDesk(),
                  ],
                  SizedBox(height: tokens.lg),
                  const _CreatePad(),
                  if (bare) ...[
                    SizedBox(height: tokens.xl),
                    EmptyState(
                      icon: Icons.dashboard_outlined,
                      title: l10n.dashboardEmptyTitle,
                      body: l10n.dashboardEmptyBody,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Masthead extends StatelessWidget {
  const _Masthead();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(tokens.radius + 14),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(tokens.bg, tokens.primary, 0.16)!,
            Color.lerp(tokens.surface, tokens.secondary, 0.1)!,
            tokens.surface,
          ],
        ),
        border: Border.all(color: tokens.primary.withValues(alpha: 0.2)),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -20,
            top: -24,
            child: ExcludeSemantics(
              child: Transform.rotate(
                angle: 0.25,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(tokens.radius + 16),
                    border: Border.all(color: tokens.secondary.withValues(alpha: 0.15), width: 2),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(tokens.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppLocalizations.of(context).homeBoardEyebrow,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: tokens.muted,
                        letterSpacing: 1.3,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                SizedBox(height: tokens.sm),
                const DashboardGreeting(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AttentionStrip extends StatelessWidget {
  const _AttentionStrip({
    required this.focus,
    required this.canTasks,
    required this.canApprovals,
    required this.canContent,
    required this.canInvoices,
  });

  final DashboardFocus focus;
  final bool canTasks;
  final bool canApprovals;
  final bool canContent;
  final bool canInvoices;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final chips = <Widget>[];

    void addChip(String label, VoidCallback onTap) {
      chips.add(
        ActionChip(
          label: Text(label),
          onPressed: onTap,
          visualDensity: VisualDensity.compact,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      );
    }

    if (canTasks && focus.urgentTasks > 0) {
      addChip(l10n.homeBoardAttentionTasks(focus.urgentTasks), () => context.push(TasksRoutes.root));
    }
    if (canApprovals && focus.pendingApprovals > 0) {
      addChip(
        l10n.homeBoardAttentionApprovals(focus.pendingApprovals),
        () => context.push(ApprovalsRoutes.root),
      );
    }
    if (canContent && focus.contentWaiting > 0) {
      addChip(l10n.homeBoardAttentionContent(focus.contentWaiting), () => context.push(ContentRoutes.root));
    }
    if (canInvoices && focus.outstandingMinor > 0) {
      addChip(l10n.homeBoardAttentionInvoices, () => context.push(InvoicesRoutes.root));
    }

    if (chips.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: tokens.sm,
      runSpacing: tokens.sm,
      children: chips,
    );
  }
}

class _PulseBento extends StatelessWidget {
  const _PulseBento({required this.tiles, required this.label});

  final List<Widget> tiles;
  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final gap = tokens.sm;
    return Semantics(
      container: true,
      label: label,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth >= 520 ? 2 : 2;
          final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
          );
        },
      ),
    );
  }
}

class _NowDesk extends ConsumerWidget {
  const _NowDesk({
    required this.focus,
    required this.canTasks,
    required this.canApprovals,
    required this.canContent,
    required this.canInvoices,
  });

  final DashboardFocus focus;
  final bool canTasks;
  final bool canApprovals;
  final bool canContent;
  final bool canInvoices;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final work = canTasks ? ref.watch(myWorkProvider) : null;
    final approvals = canApprovals ? ref.watch(approvalSummaryProvider) : null;
    final content = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentView)))
        ? ref.watch(dashboardContentProvider).value
        : null;
    final titles = {for (final item in content ?? const <ContentRef>[]) item.id: item.title};

    final loading = (work != null && work.isLoading && !work.hasValue) ||
        (approvals != null && approvals.isLoading && !approvals.hasValue);
    final error = work?.hasError == true || approvals?.hasError == true;

    Widget body;
    if (loading) {
      body = const SectionSkeleton(rows: 3);
    } else if (error) {
      body = InlineRetry(
        error: work?.error ?? approvals?.error ?? const Object(),
        onRetry: () {
          if (canTasks) ref.invalidate(dashboardTasksProvider);
          if (canApprovals) ref.invalidate(dashboardApprovalsProvider);
        },
      );
    } else {
      final tasks = work?.value?.tasks ?? const <WorkTask>[];
      final pending = approvals?.value?.pending.take(dashboardListLimit).toList() ?? const <ApprovalRef>[];
      final extra = <Widget>[
        if (canContent && focus.contentWaiting > 0)
          _ContentAttentionRow(count: focus.contentWaiting),
        if (canInvoices && focus.outstandingMinor > 0) const _InvoiceAttentionRow(),
      ];
      final hasRows = tasks.isNotEmpty || pending.isNotEmpty || extra.isNotEmpty;
      if (!hasRows) {
        body = SectionEmpty(message: l10n.dashboardMyWorkEmpty, icon: Icons.wb_sunny_outlined);
      } else {
        body = Column(
          children: [
            for (final (i, task) in tasks.indexed) ...[
              if (i > 0) const Divider(height: 1),
              _TaskRow(task: task),
            ],
            for (final (i, approval) in pending.indexed) ...[
              if (tasks.isNotEmpty || i > 0) const Divider(height: 1),
              _ApprovalRow(approval: approval, title: titles[approval.subjectId]),
            ],
            for (final (i, row) in extra.indexed) ...[
              if (tasks.isNotEmpty || pending.isNotEmpty || i > 0) const Divider(height: 1),
              row,
            ],
          ],
        );
      }
    }

    return SectionCard(
      title: l10n.homeBoardNow,
      trailing: ViewAllButton(
        onPressed: () {
          if (canTasks) {
            context.push(TasksRoutes.root);
          } else if (canApprovals) {
            context.push(ApprovalsRoutes.root);
          } else if (canContent && focus.contentWaiting > 0) {
            context.push(ContentRoutes.root);
          } else {
            context.push(InvoicesRoutes.root);
          }
        },
      ),
      child: body,
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

class _ContentAttentionRow extends StatelessWidget {
  const _ContentAttentionRow({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return OverviewRow(
      leading: const RowMark(icon: Icons.rate_review_outlined),
      title: l10n.homeBoardAttentionContent(count),
      subtitle: l10n.navContent,
      semanticLabel: l10n.homeBoardAttentionContent(count),
      onTap: () => context.push(ContentRoutes.root),
    );
  }
}

class _InvoiceAttentionRow extends StatelessWidget {
  const _InvoiceAttentionRow();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return OverviewRow(
      leading: RowMark(
        icon: Icons.receipt_long_outlined,
        color: StatusTone.warning.color(context.tokens),
      ),
      title: l10n.homeBoardAttentionInvoices,
      subtitle: l10n.navInvoices,
      semanticLabel: l10n.homeBoardAttentionInvoices,
      onTap: () => context.push(InvoicesRoutes.root),
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

class _HorizonDesk extends ConsumerWidget {
  const _HorizonDesk();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final upcoming = ref.watch(upcomingProvider);

    return SectionCard(
      title: l10n.homeBoardNext,
      trailing: ViewAllButton(onPressed: () => context.push(CalendarRoutes.root)),
      child: switch (upcoming) {
        AsyncValue(value: final items?) when items.isEmpty => SectionEmpty(
            message: l10n.dashboardUpcomingEmpty(dashboardHorizonDays),
            icon: Icons.event_available_outlined,
          ),
        AsyncValue(value: final items?) => Column(
            children: [
              for (final (i, item) in items.take(dashboardListLimit).indexed) ...[
                if (i > 0) const Divider(height: 1),
                _UpcomingRow(item: item),
              ],
            ],
          ),
        AsyncValue(hasError: true) => InlineRetry(
            error: upcoming.error ?? const Object(),
            onRetry: () {
              ref
                ..invalidate(dashboardCalendarProvider)
                ..invalidate(dashboardContentProvider);
            },
          ),
        _ => const SectionSkeleton(rows: 2),
      },
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
    return OverviewRow(
      leading: DateBlock(date: item.at),
      title: item.title,
      subtitle: subtitle,
      semanticLabel: '${item.title}, ${formats.date(item.at)}, $subtitle',
      onTap: () => context.push(_route()),
    );
  }
}

class _CreatePad extends ConsumerWidget {
  const _CreatePad();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final actions = dashboardQuickActions.where((a) => policy.can(a.permission)).toList();
    if (actions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.homeBoardCreate.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: tokens.muted,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w700,
              ),
        ),
        SizedBox(height: tokens.sm),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 400;
            final count = wide ? 4 : 2;
            final gap = tokens.sm;
            final width = (constraints.maxWidth - gap * (count - 1)) / count;
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [
                for (final action in actions)
                  SizedBox(
                    width: width,
                    child: _CreateTile(
                      icon: action.icon,
                      label: action.label(l10n),
                      onTap: () => context.push(action.route),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _CreateTile extends StatelessWidget {
  const _CreateTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Material(
      color: tokens.subtle,
      borderRadius: BorderRadius.circular(tokens.radius + 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(tokens.md),
          child: Row(
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  color: tokens.surface,
                  borderRadius: BorderRadius.circular(tokens.radius),
                  border: Border.all(color: tokens.border),
                ),
                child: Padding(
                  padding: EdgeInsets.all(tokens.sm),
                  child: Icon(icon, size: 18, color: tokens.primary),
                ),
              ),
              SizedBox(width: tokens.sm),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
