import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/invoices_controller.dart';
import '../domain/invoice.dart';
import '../invoices_routes.dart';
import 'invoice_card.dart';
import 'invoice_status.dart';
import '../../../core/widgets/menu_filter_chip.dart';

class InvoicesScreen extends ConsumerStatefulWidget {
  const InvoicesScreen({this.initialClientId, super.key});

  final String? initialClientId;

  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen> {
  String? _status;
  late String? _clientId = widget.initialClientId;

  void _create() => context.push(InvoicesRoutes.create);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final invoices = ref.watch(invoicesProvider);
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final isPortal = ref.watch(sessionProvider.select((s) => s.value?.isClientPortal ?? false));
    final items = invoices.value ?? const <Invoice>[];
    final now = DateTime.now();
    String clientName(Invoice invoice) => clients.nameOf(invoice.clientId) ?? l10n.invoiceClientUnknown;
    String nameOf(String id) => clients.nameOf(id) ?? l10n.invoiceClientUnknown;
    final clientIds = {for (final invoice in items) invoice.clientId}.where((id) => clients[id] != null).toList()
      ..sort((a, b) => nameOf(a).compareTo(nameOf(b)));
    final scoped = items.where((invoice) => _clientId == null || invoice.clientId == _clientId);

    Widget createAction(Widget child) =>
        isPortal ? const SizedBox.shrink() : PermissionGate(anyOf: const [Permissions.invoicesCreate], child: child);

    return PageScaffold(
      title: l10n.invoicesTitle,
      floatingActionButton: createAction(CreateFab(label: l10n.invoiceNew, onPressed: _create)),
      body: ResourceList<Invoice>(
        value: invoices,
        onRefresh: () => ref.refresh(invoicesProvider.future),
        minTileWidth: 360,
        tileHeight: 148,
        searchHint: l10n.invoicesSearch,
        matches: (invoice, query) =>
            invoice.number.toLowerCase().contains(query) || clientName(invoice).toLowerCase().contains(query),
        filter: (invoice) =>
            (_clientId == null || invoice.clientId == _clientId) &&
            (_status == null || invoice.effectiveStatus(now) == _status),
        sort: (a, b) => b.displayDate.compareTo(a.displayDate),
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SummaryStrip(
              summary: InvoiceSummary.of(scoped, now: now),
              onStatus: (s) => setState(() => _status = s),
            ),
            SizedBox(height: context.tokens.md),
            if (!isPortal && widget.initialClientId == null && clientIds.length > 1) ...[
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: MenuFilterChip<String>(
                  label: l10n.invoiceClient,
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
              options: InvoiceStatuses.values,
              selected: _status,
              labelOf: (status) => invoiceStatusLabel(l10n, status),
              countOf: (status) =>
                  status == null ? scoped.length : scoped.where((i) => i.effectiveStatus(now) == status).length,
              onSelected: (status) => setState(() => _status = status),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.receipt_long_outlined,
          title: l10n.invoicesEmpty,
          body: isPortal ? l10n.invoicesEmptyPortalBody : l10n.invoicesEmptyBody,
          action: createAction(
            FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.invoiceNew)),
          ),
        ),
        itemBuilder: (context, invoice) => InvoiceCard(
          invoice: invoice,
          clientName: clientName(invoice),
          onTap: () => context.push(InvoicesRoutes.detail(invoice.id)),
        ),
      ),
    );
  }
}

class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({required this.summary, required this.onStatus});

  final InvoiceSummary summary;
  final ValueChanged<String> onStatus;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    String money(int minor) => invoiceMoney(context, minor);
    final tiles = [
      MetricTile(
        label: l10n.invoiceSummaryOutstanding,
        icon: Icons.schedule_send_outlined,
        value: money(summary.outstanding),
        onTap: () => onStatus(InvoiceStatuses.sent),
      ),
      MetricTile(
        label: l10n.invoiceSummaryOverdue,
        icon: Icons.warning_amber_rounded,
        value: money(summary.overdue),
        caption: summary.overdueCount == 0 ? null : l10n.invoiceCount(summary.overdueCount),
        tone: summary.overdue > 0 ? StatusTone.danger : StatusTone.neutral,
        onTap: () => onStatus(InvoiceStatuses.overdue),
      ),
      MetricTile(
        label: l10n.invoiceSummaryPaidThisMonth,
        icon: Icons.check_circle_outline,
        value: money(summary.paidThisMonth),
        tone: summary.paidThisMonth > 0 ? StatusTone.success : StatusTone.neutral,
        onTap: () => onStatus(InvoiceStatuses.paid),
      ),
      MetricTile(
        label: l10n.invoiceSummaryDrafts,
        icon: Icons.edit_note_outlined,
        value: money(summary.drafts),
        caption: summary.draftCount == 0 ? null : l10n.invoiceCount(summary.draftCount),
        onTap: () => onStatus(InvoiceStatuses.draft),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = gridColumns(constraints.maxWidth, minTileWidth: 160, max: tiles.length);
        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
        return Wrap(
          spacing: tokens.md,
          runSpacing: tokens.md,
          children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
        );
      },
    );
  }
}
