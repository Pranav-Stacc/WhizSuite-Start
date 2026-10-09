import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../content/content_routes.dart';
import '../../dashboard/presentation/sections/dashboard_header.dart';
import '../../dashboard/presentation/widgets/overview_layout.dart';
import '../../dashboard/presentation/widgets/overview_section.dart';
import '../../dashboard/presentation/widgets/status_display.dart';
import '../../invoices/invoices_routes.dart';
import '../../messages/messages_routes.dart';
import '../../profile/data/profile_repository.dart';
import '../../projects/projects_routes.dart';
import '../application/portal_providers.dart';
import '../domain/portal_models.dart';
import '../domain/portal_summary.dart';

/// Client-member home: greeting, KPIs and the approvals, invoices, messages and
/// projects the member is permitted to see. Every section loads independently.
class PortalHome extends ConsumerWidget {
  const PortalHome({super.key});

  static const _sectionStagger = 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final policy = ref.watch(accessPolicyProvider);
    final client = ref.watch(portalClientProvider).value;
    final name = greetingName(ref.watch(profileProvider).value, ref.watch(sessionProvider).value);
    final sections = <Widget>[
      if (policy.can(Permissions.contentView)) const _ApprovalsSection(),
      if (policy.can(Permissions.invoicesView)) const _InvoicesSection(),
      if (policy.can(Permissions.chatView)) const _MessagesSection(),
      if (policy.can(Permissions.projectsView)) const _ProjectsSection(),
      if (policy.can(Permissions.contentView)) const _ContentSection(),
    ];
    final hasKpis = portalKpiPermissions.any(policy.can);
    final bare = !hasKpis && sections.isEmpty;

    return PageScaffold(
      title: l10n.navHome,
      body: OverviewScrollView(
        onRefresh: () => refreshPortal(ref),
        children: [
          FadeSlideIn(child: _PortalHeader(clientName: client?.name, memberName: name)),
          if (hasKpis) ...[SizedBox(height: tokens.md), const _PortalKpis()],
          if (sections.isNotEmpty) ...[
            SizedBox(height: tokens.lg),
            OverviewColumns(staggerOffset: _sectionStagger, children: sections),
          ],
          if (bare) ...[
            SizedBox(height: tokens.xl),
            FadeSlideIn(
              index: 1,
              child: EmptyState(
                icon: Icons.home_outlined,
                title: l10n.portalEmptyTitle,
                body: l10n.portalEmptyBody,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Greeting + quick actions laid out like the staff [DashboardHeader].
class _PortalHeader extends StatelessWidget {
  const _PortalHeader({required this.clientName, required this.memberName});

  final String? clientName;
  final String memberName;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final greeting = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.portalWelcome.toUpperCase(),
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: tokens.primary,
                letterSpacing: 0.8,
              ),
        ),
        SizedBox(height: tokens.sm),
        DashboardGreeting(
          title: clientName,
          subtitle: memberName.isEmpty ? l10n.portalSubtitleFallback : l10n.portalSubtitle(memberName),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < overviewWideBreakpoint) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [greeting, SizedBox(height: tokens.lg), const _PortalQuickActions()],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(child: greeting),
            SizedBox(width: tokens.xl),
            const Flexible(child: Align(alignment: AlignmentDirectional.centerEnd, child: _PortalQuickActions())),
          ],
        );
      },
    );
  }
}

typedef _PortalAction = ({String permission, IconData icon, String Function(AppLocalizations) label, String route});

final List<_PortalAction> _portalActions = [
  (
    permission: Permissions.contentView,
    icon: Icons.fact_check_outlined,
    label: (l10n) => l10n.portalQuickReview,
    route: ContentRoutes.root,
  ),
  (
    permission: Permissions.invoicesView,
    icon: Icons.receipt_long_outlined,
    label: (l10n) => l10n.portalQuickInvoices,
    route: InvoicesRoutes.root,
  ),
  (
    permission: Permissions.chatSend,
    icon: Icons.forum_outlined,
    label: (l10n) => l10n.portalQuickMessage,
    route: MessagesRoutes.root,
  ),
  (
    permission: Permissions.projectsView,
    icon: Icons.folder_outlined,
    label: (l10n) => l10n.portalQuickProjects,
    route: ProjectsRoutes.root,
  ),
];

class _PortalQuickActions extends ConsumerWidget {
  const _PortalQuickActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final permitted =
        ref.watch(accessPolicyProvider.select((p) => p.canAny([for (final a in _portalActions) a.permission])));
    if (!permitted) return const SizedBox.shrink();
    return Semantics(
      container: true,
      label: l10n.portalQuickActions,
      child: Wrap(
        spacing: tokens.sm,
        runSpacing: tokens.sm,
        children: [
          for (final action in _portalActions)
            PermissionGate(
              anyOf: [action.permission],
              child: OutlinedButton.icon(
                onPressed: () => context.go(action.route),
                icon: Icon(action.icon, size: 18),
                label: Text(action.label(l10n)),
              ),
            ),
        ],
      ),
    );
  }
}

class _PortalKpis extends ConsumerWidget {
  const _PortalKpis();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final policy = ref.watch(accessPolicyProvider);
    final summary = ref.watch(portalSummaryProvider);
    return MetricGrid(
      semanticLabel: l10n.portalKpiAria,
      tiles: [
        if (policy.can(Permissions.contentView))
          AsyncMetricTile<PortalSummary>(
            label: l10n.portalKpiApprovals,
            icon: Icons.fact_check_outlined,
            value: summary,
            onRetry: () => ref.invalidate(portalContentProvider),
            onTap: () => context.go(ContentRoutes.root),
            present: (data) => (
              value: context.formats.number(data.approvals),
              caption: l10n.portalKpiApprovalsCaption(data.approvals),
              tone: data.approvals > 0 ? StatusTone.warning : StatusTone.neutral,
            ),
          ),
        if (policy.can(Permissions.invoicesView))
          AsyncMetricTile<PortalSummary>(
            label: l10n.portalKpiInvoices,
            icon: Icons.receipt_long_outlined,
            value: summary,
            onRetry: () => ref.invalidate(portalInvoicesProvider),
            onTap: () => context.go(InvoicesRoutes.root),
            present: (data) => (
              value: context.formats.number(data.openInvoices),
              caption: l10n.portalKpiInvoicesCaption(data.openInvoices),
              tone: data.openInvoices > 0 ? StatusTone.info : StatusTone.neutral,
            ),
          ),
        if (policy.can(Permissions.chatView))
          AsyncMetricTile<PortalSummary>(
            label: l10n.portalKpiMessages,
            icon: Icons.forum_outlined,
            value: summary,
            onRetry: () => ref.invalidate(portalRoomsProvider),
            onTap: () => context.go(MessagesRoutes.root),
            present: (data) => (
              value: context.formats.number(data.openThreads),
              caption: l10n.portalKpiMessagesCaption(data.openThreads),
              tone: data.openThreads > 0 ? StatusTone.info : StatusTone.neutral,
            ),
          ),
        if (policy.can(Permissions.projectsView))
          AsyncMetricTile<PortalSummary>(
            label: l10n.portalKpiProjects,
            icon: Icons.folder_outlined,
            value: summary,
            onRetry: () => ref.invalidate(portalProjectsProvider),
            onTap: () => context.go(ProjectsRoutes.root),
            present: (data) => (
              value: context.formats.number(data.activeProjects),
              caption: l10n.portalKpiProjectsCaption(data.activeProjects),
              tone: StatusTone.neutral,
            ),
          ),
      ],
    );
  }
}

class _ApprovalsSection extends ConsumerWidget {
  const _ApprovalsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<PortalSummary>(
      title: l10n.portalApprovalsTitle,
      trailing: ViewAllButton(onPressed: () => context.go(ContentRoutes.root), label: l10n.portalApprovalsCta),
      value: ref.watch(portalSummaryProvider),
      onRetry: () => ref.invalidate(portalContentProvider),
      builder: (context, summary) => summary.approvalRows.isEmpty
          ? SectionEmpty(
              message: l10n.portalApprovalsEmpty,
              action: TextButton(onPressed: () => context.go(ContentRoutes.root), child: Text(l10n.portalApprovalsCta)),
            )
          : OverviewList(
              children: [
                for (final item in summary.approvalRows) _ContentRow(item: item),
              ],
            ),
    );
  }
}

class _InvoicesSection extends ConsumerWidget {
  const _InvoicesSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<PortalSummary>(
      title: l10n.portalInvoicesTitle,
      trailing: ViewAllButton(onPressed: () => context.go(InvoicesRoutes.root), label: l10n.portalInvoicesCta),
      value: ref.watch(portalSummaryProvider),
      onRetry: () => ref.invalidate(portalInvoicesProvider),
      builder: (context, summary) => summary.openInvoiceRows.isEmpty
          ? SectionEmpty(
              message: l10n.portalInvoicesEmpty,
              icon: Icons.receipt_long_outlined,
              action: TextButton(onPressed: () => context.go(InvoicesRoutes.root), child: Text(l10n.portalInvoicesCta)),
            )
          : OverviewList(
              children: [
                for (final invoice in summary.openInvoiceRows) _InvoiceRow(invoice: invoice),
              ],
            ),
    );
  }
}

class _MessagesSection extends ConsumerWidget {
  const _MessagesSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<PortalSummary>(
      title: l10n.portalMessagesTitle,
      trailing: ViewAllButton(onPressed: () => context.go(MessagesRoutes.root), label: l10n.portalMessagesCta),
      value: ref.watch(portalSummaryProvider),
      onRetry: () => ref.invalidate(portalRoomsProvider),
      builder: (context, summary) => summary.roomRows.isEmpty
          ? SectionEmpty(
              message: l10n.portalMessagesEmpty,
              icon: Icons.chat_bubble_outline,
              action: TextButton(onPressed: () => context.go(MessagesRoutes.root), child: Text(l10n.portalMessagesCta)),
            )
          : OverviewList(
              children: [
                for (final room in summary.roomRows) _RoomRow(room: room),
              ],
            ),
    );
  }
}

class _ProjectsSection extends ConsumerWidget {
  const _ProjectsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<PortalSummary>(
      title: l10n.portalProjectsTitle,
      trailing: ViewAllButton(onPressed: () => context.go(ProjectsRoutes.root), label: l10n.portalProjectsCta),
      value: ref.watch(portalSummaryProvider),
      onRetry: () => ref.invalidate(portalProjectsProvider),
      builder: (context, summary) => summary.projectRows.isEmpty
          ? SectionEmpty(
              message: l10n.portalProjectsEmpty,
              icon: Icons.folder_outlined,
              action: TextButton(onPressed: () => context.go(ProjectsRoutes.root), child: Text(l10n.portalProjectsCta)),
            )
          : OverviewList(
              children: [
                for (final project in summary.projectRows) _ProjectRow(project: project),
              ],
            ),
    );
  }
}

class _ContentSection extends ConsumerWidget {
  const _ContentSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    return OverviewSection<PortalSummary>(
      title: l10n.portalContentTitle,
      trailing: ViewAllButton(onPressed: () => context.go(ContentRoutes.root), label: l10n.portalContentCta),
      value: ref.watch(portalSummaryProvider),
      onRetry: () => ref.invalidate(portalContentProvider),
      builder: (context, summary) => summary.recentContent.isEmpty
          ? SectionEmpty(message: l10n.portalContentEmpty, icon: Icons.article_outlined)
          : OverviewList(
              children: [
                for (final item in summary.recentContent) _ContentRow(item: item),
              ],
            ),
    );
  }
}

class _ContentRow extends StatelessWidget {
  const _ContentRow({required this.item});

  final PortalContent item;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final status = l10n.portalContentStatus(item.status);
    final scheduled = item.scheduledAt;
    final subtitle = scheduled == null ? status : l10n.portalScheduled(formats.relative(scheduled));
    return OverviewRow(
      leading: const RowMark(icon: Icons.article_outlined),
      title: item.title,
      subtitle: subtitle,
      trailing: StatusBadge(label: status, tone: contentStatusTone(item.status), dense: true),
      semanticLabel: '${item.title}, $status',
      onTap: () => context.push(ContentRoutes.detail(item.id)),
    );
  }
}

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow({required this.invoice});

  final PortalInvoice invoice;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final now = DateTime.now();
    final status = invoice.effectiveStatus(now);
    final due = invoice.dueDate;
    final subtitle = due == null ? l10n.portalInvoiceStatus(status) : l10n.portalDue(formats.date(due));
    return OverviewRow(
      leading: const RowMark(icon: Icons.receipt_long_outlined),
      title: invoice.number,
      subtitle: subtitle,
      trailing: StatusBadge(
        label: formats.money(invoice.totalMinor, currency: invoice.currency),
        tone: invoiceStatusTone(status),
        dense: true,
      ),
      semanticLabel: '${invoice.number}, $subtitle',
      onTap: () => context.push(InvoicesRoutes.detail(invoice.id)),
    );
  }
}

class _RoomRow extends StatelessWidget {
  const _RoomRow({required this.room});

  final PortalRoom room;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final title = room.name ?? l10n.messagesAgencyConversation;
    final preview = room.lastMessagePreview;
    final when = room.lastMessageAt;
    final subtitle = preview ?? (when == null ? l10n.messagesNoMessages : formats.relative(when));
    return OverviewRow(
      leading: const RowMark(icon: Icons.forum_outlined),
      title: title,
      subtitle: subtitle,
      trailing: room.hasUnread
          ? StatusBadge(label: l10n.portalMessageOpen, tone: StatusTone.info, dense: true)
          : null,
      semanticLabel: title,
      onTap: () => context.push(MessagesRoutes.detail(room.id)),
    );
  }
}

class _ProjectRow extends StatelessWidget {
  const _ProjectRow({required this.project});

  final PortalProject project;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final status = l10n.portalProjectStatus(project.status);
    return OverviewRow(
      leading: const RowMark(icon: Icons.folder_outlined),
      title: project.name,
      subtitle: status,
      trailing: StatusBadge(label: status, tone: projectStatusTone(project.status), dense: true),
      semanticLabel: '${project.name}, $status',
      onTap: () => context.push(ProjectsRoutes.detail(project.id)),
    );
  }
}
