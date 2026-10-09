import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../application/invoices_controller.dart';
import '../domain/invoice.dart';
import '../invoices_routes.dart';
import 'invoice_document.dart';
import 'invoice_status.dart';

enum _MenuAction { edit, copyNumber, copySummary, delete }

class InvoiceDetailScreen extends ConsumerWidget {
  const InvoiceDetailScreen({required this.invoiceId, super.key});

  final String invoiceId;

  /// Staff with `invoices.create` may change invoices; the portal is always read-only.
  static bool canManage(WidgetRef ref) {
    final isPortal = ref.watch(sessionProvider.select((s) => s.value?.isClientPortal ?? false));
    final allowed = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.invoicesCreate)));
    return allowed && !isPortal;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final invoice = ref.watch(invoiceProvider(invoiceId));
    final clients = ref.watch(clientDirectoryProvider).value;
    final loaded = invoice.value;
    final manage = canManage(ref);
    String clientName(Invoice invoice) => clients?.nameOf(invoice.clientId) ?? l10n.invoiceClientUnknown;

    return PageScaffold(
      title: loaded?.number ?? l10n.invoicesTitle,
      actions: [
        if (loaded != null)
          PopupMenuButton<_MenuAction>(
            tooltip: l10n.moreActions,
            onSelected: (action) => _onMenu(context, ref, loaded, clientName(loaded), action),
            itemBuilder: (_) => [
              if (manage && loaded.isDraft)
                PopupMenuItem(
                  value: _MenuAction.edit,
                  child: ListTile(leading: const Icon(Icons.edit_outlined), title: Text(l10n.invoiceEdit)),
                ),
              PopupMenuItem(
                value: _MenuAction.copyNumber,
                child: ListTile(leading: const Icon(Icons.copy_outlined), title: Text(l10n.invoiceCopyNumber)),
              ),
              PopupMenuItem(
                value: _MenuAction.copySummary,
                child: ListTile(leading: const Icon(Icons.ios_share_outlined), title: Text(l10n.invoiceShare)),
              ),
              if (manage && loaded.isDraft)
                PopupMenuItem(
                  value: _MenuAction.delete,
                  child: ListTile(
                    leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                    title: Text(l10n.delete, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ),
                ),
            ],
          ),
      ],
      body: AsyncValueView<Invoice>(
        value: invoice,
        onRetry: () => ref.invalidate(invoiceProvider(invoiceId)),
        data: (invoice) => ReadableBody(
          onRefresh: () => ref.refresh(invoiceProvider(invoiceId).future),
          children: [
            if (manage && (invoice.nextStatuses.isNotEmpty || invoice.isDraft)) ...[
              FadeSlideIn(child: _ActionBar(invoice: invoice)),
              SizedBox(height: context.tokens.lg),
            ],
            FadeSlideIn(
              index: 1,
              child: InvoiceDocument(invoice: invoice, clientName: clientName(invoice)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _onMenu(
    BuildContext context,
    WidgetRef ref,
    Invoice invoice,
    String clientName,
    _MenuAction action,
  ) async {
    final l10n = AppLocalizations.of(context);
    switch (action) {
      case _MenuAction.edit:
        context.go(InvoicesRoutes.edit(invoice.id));
      case _MenuAction.copyNumber:
        await Clipboard.setData(ClipboardData(text: invoice.number));
        if (context.mounted) showToast(context, l10n.invoiceCopied);
      case _MenuAction.copySummary:
        final due = invoice.dueDate;
        final summary = l10n.invoiceShareText(
          invoice.number,
          clientName,
          invoiceMoney(context, invoice.totalMinor, currency: invoice.currency),
          due == null ? l10n.valueUnknown : context.formats.date(due),
        );
        await Clipboard.setData(ClipboardData(text: summary));
        if (context.mounted) showToast(context, l10n.invoiceSummaryCopied);
      case _MenuAction.delete:
        final confirmed = await confirmAction(
          context,
          title: l10n.deleteConfirmTitle(invoice.number),
          body: l10n.deleteConfirmBody,
          confirmLabel: l10n.delete,
          destructive: true,
        );
        if (!confirmed || !context.mounted) return;
        final deleted = await runAction(
          context,
          () => ref.read(invoicesActionsProvider).delete(invoice.id),
          success: l10n.deletedToast,
        );
        if (deleted && context.mounted) context.go(InvoicesRoutes.root);
    }
  }
}

/// Lifecycle buttons for the transitions the contract allows from the current status.
class _ActionBar extends ConsumerWidget {
  const _ActionBar({required this.invoice});

  final Invoice invoice;

  Future<void> _transition(BuildContext context, WidgetRef ref, String target) async {
    final l10n = AppLocalizations.of(context);
    final needsConfirm = target == InvoiceStatuses.voidValue || target == InvoiceStatuses.paid;
    if (needsConfirm) {
      final confirmed = await confirmAction(
        context,
        title: l10n.invoiceTransitionConfirmTitle(target, invoice.number),
        body: l10n.invoiceTransitionConfirmBody(target),
        confirmLabel: l10n.invoiceTransitionAction(target),
        destructive: target == InvoiceStatuses.voidValue,
      );
      if (!confirmed || !context.mounted) return;
    }
    await runAction(
      context,
      () => ref.read(invoicesActionsProvider).setStatus(invoice.id, target),
      success: l10n.invoiceTransitionDone(target),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final next = invoice.nextStatuses;
    final forward = next.where((s) => s != InvoiceStatuses.voidValue);
    return Wrap(
      spacing: tokens.sm,
      runSpacing: tokens.sm,
      alignment: WrapAlignment.end,
      children: [
        if (invoice.isDraft)
          OutlinedButton.icon(
            onPressed: () => context.go(InvoicesRoutes.edit(invoice.id)),
            icon: const Icon(Icons.edit_outlined),
            label: Text(l10n.edit),
          ),
        if (next.contains(InvoiceStatuses.voidValue))
          OutlinedButton.icon(
            onPressed: () => _transition(context, ref, InvoiceStatuses.voidValue),
            icon: const Icon(Icons.block_outlined),
            label: Text(l10n.invoiceTransitionAction(InvoiceStatuses.voidValue)),
          ),
        for (final target in forward)
          FilledButton.icon(
            onPressed: () => _transition(context, ref, target),
            icon: Icon(target == InvoiceStatuses.paid ? Icons.check_circle_outline : Icons.send_outlined),
            label: Text(l10n.invoiceTransitionAction(target)),
          ),
      ],
    );
  }
}
