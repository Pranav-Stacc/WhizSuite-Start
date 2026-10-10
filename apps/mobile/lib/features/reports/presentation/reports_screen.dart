import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/reports_controller.dart';
import '../domain/report.dart';
import '../reports_routes.dart';
import 'analytics_view.dart';
import 'report_card.dart';
import 'report_form.dart';
import 'report_status.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({this.initialClientId, this.initialTab, super.key});

  final String? initialClientId;
  final String? initialTab;

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> with SingleTickerProviderStateMixin {
  static const _reportsTab = 0;
  static const _analyticsTab = 1;

  late final TabController _tabs = TabController(
    length: 2,
    vsync: this,
    initialIndex: widget.initialTab == ReportsRoutes.analyticsTab ? _analyticsTab : _reportsTab,
  )..addListener(_onTab);

  void _onTab() {
    if (!_tabs.indexIsChanging) setState(() {});
  }

  @override
  void dispose() {
    _tabs
      ..removeListener(_onTab)
      ..dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final id = await showReportForm(context, ref);
    if (id == null || !mounted) return;
    showToast(context, l10n.createdToast);
    context.push(ReportsRoutes.detail(id));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final manage = canManageReports(ref);
    return PageScaffold(
      title: l10n.reportsTitle,
      bottom: TabBar(
        controller: _tabs,
        tabs: [
          Tab(icon: const Icon(Icons.description_outlined), text: l10n.reportsTab),
          Tab(icon: const Icon(Icons.insights_outlined), text: l10n.reportAnalyticsTab),
        ],
      ),
      floatingActionButton: manage && _tabs.index == _reportsTab
          ? CreateFab(label: l10n.reportNew, onPressed: _create)
          : null,
      body: TabBarView(
        controller: _tabs,
        children: [
          _ReportsList(onCreate: manage ? _create : null),
          AnalyticsView(initialClientId: widget.initialClientId),
        ],
      ),
    );
  }
}

class _ReportsList extends ConsumerStatefulWidget {
  const _ReportsList({required this.onCreate});

  final VoidCallback? onCreate;

  @override
  ConsumerState<_ReportsList> createState() => _ReportsListState();
}

class _ReportsListState extends ConsumerState<_ReportsList> with AutomaticKeepAliveClientMixin {
  String? _status;
  String? _clientId;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final reports = ref.watch(reportsProvider);
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final isPortal = ref.watch(sessionProvider.select((s) => s.value?.isClientPortal ?? false));
    final items = reports.value ?? const <Report>[];
    String nameOf(String id) => clients.nameOf(id) ?? l10n.reportClientUnknown;
    final clientIds = {for (final report in items) report.clientId}.where((id) => clients[id] != null).toList()
      ..sort((a, b) => nameOf(a).compareTo(nameOf(b)));
    final scoped = items.where((report) => _clientId == null || report.clientId == _clientId);
    final onCreate = widget.onCreate;

    return ResourceList<Report>(
      value: reports,
      onRefresh: () => ref.refresh(reportsProvider.future),
      minTileWidth: 360,
      tileHeight: 168,
      searchHint: l10n.reportsSearch,
      matches: (report, query) =>
          report.title.toLowerCase().contains(query) || nameOf(report.clientId).toLowerCase().contains(query),
      filter: (report) =>
          (_clientId == null || report.clientId == _clientId) && (_status == null || report.status == _status),
      sort: (a, b) => b.periodEnd.compareTo(a.periodEnd),
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (scoped.isNotEmpty) ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final tokens = context.tokens;
                final tiles = [
                  for (final status in ReportStatuses.values)
                    MetricTile(
                      label: reportStatusLabel(l10n, status),
                      icon: switch (status) {
                        ReportStatuses.draft => Icons.edit_note_outlined,
                        ReportStatuses.ready => Icons.check_circle_outline,
                        ReportStatuses.sent => Icons.send_outlined,
                        _ => Icons.description_outlined,
                      },
                      value: '${scoped.where((r) => r.status == status).length}',
                      onTap: () => setState(() => _status = status),
                    ),
                ];
                final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                return Wrap(
                  spacing: tokens.md,
                  runSpacing: tokens.md,
                  children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                );
              },
            ),
            SizedBox(height: context.tokens.md),
          ],
          if (!isPortal && clientIds.length > 1) ...[
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: MenuFilterChip<String>(
                label: l10n.reportClient,
                icon: Icons.business_outlined,
                options: clientIds,
                selected: _clientId,
                labelOf: nameOf,
                onSelected: (id) => setState(() => _clientId = id),
              ),
            ),
            SizedBox(height: context.tokens.sm),
          ],
          FilterBar<String>(
            options: ReportStatuses.values,
            selected: _status,
            labelOf: (status) => reportStatusLabel(l10n, status),
            countOf: (status) => status == null ? scoped.length : scoped.where((r) => r.status == status).length,
            onSelected: (status) => setState(() => _status = status),
          ),
        ],
      ),
      empty: EmptyState(
        icon: Icons.description_outlined,
        title: l10n.reportsEmpty,
        body: isPortal ? l10n.reportsEmptyPortalBody : l10n.reportsEmptyBody,
        action: onCreate == null
            ? null
            : FilledButton.icon(onPressed: onCreate, icon: const Icon(Icons.add), label: Text(l10n.reportNew)),
      ),
      itemBuilder: (context, report) => ReportCard(
        report: report,
        clientName: nameOf(report.clientId),
        onTap: () => context.push(ReportsRoutes.detail(report.id)),
      ),
    );
  }
}
