import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/invoice.dart';
import 'invoice_status.dart';

const _tabular = [FontFeature.tabularFigures()];

class InvoiceCard extends StatelessWidget {
  const InvoiceCard({required this.invoice, required this.clientName, required this.onTap, super.key});

  final Invoice invoice;
  final String clientName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final status = invoice.effectiveStatus();
    final due = invoiceDueLabel(formats, invoice);
    final total = invoiceMoney(context, invoice.totalMinor, currency: invoice.currency);
    final statusLabel = invoiceStatusLabel(l10n, status);

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: l10n.invoiceCardSemantics(invoice.number, clientName, statusLabel, total),
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InitialsAvatar(name: clientName, seed: invoice.clientId, mark: true, size: 40),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(invoice.number, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                      Text(
                        clientName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(color: tokens.muted),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: tokens.sm),
                StatusBadge(label: statusLabel, tone: invoiceStatusTone(status)),
              ],
            ),
            SizedBox(height: tokens.lg),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invoice.issueDate == null
                            ? l10n.invoiceCreatedOn(formats.shortDate(invoice.createdAt))
                            : l10n.invoiceIssuedOn(formats.shortDate(invoice.displayDate)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.labelSmall?.copyWith(color: tokens.muted),
                      ),
                      if (due != null) ...[
                        SizedBox(height: tokens.xs),
                        Row(
                          children: [
                            Icon(
                              Icons.event_outlined,
                              size: 14,
                              color: due.tone == StatusTone.neutral ? tokens.muted : due.tone.color(tokens),
                            ),
                            SizedBox(width: tokens.xs),
                            Flexible(
                              child: Text(
                                due.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: text.labelMedium?.copyWith(
                                  color: due.tone == StatusTone.neutral ? tokens.secondary : due.tone.color(tokens),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                SizedBox(width: tokens.md),
                Text(
                  total,
                  style: text.titleMedium?.copyWith(fontWeight: FontWeight.w600, fontFeatures: _tabular),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
