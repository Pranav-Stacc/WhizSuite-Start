import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/invoice.dart';
import 'invoice_status.dart';

const _tabular = [FontFeature.tabularFigures()];

/// The invoice as the client sees it: parties, dates, line items and totals.
class InvoiceDocument extends StatelessWidget {
  const InvoiceDocument({required this.invoice, required this.clientName, super.key});

  /// Below this width line items stack instead of using table columns.
  static const _tableMinWidth = 520.0;

  final Invoice invoice;
  final String clientName;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final status = invoice.effectiveStatus();
    final eyebrow = text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 1.4);

    return SurfaceCard(
      padding: EdgeInsets.all(tokens.xl),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= _tableMinWidth;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.invoiceDocumentTitle.toUpperCase(), style: eyebrow),
                        SizedBox(height: tokens.xs),
                        Semantics(
                          header: true,
                          child: Text(invoice.number, style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(label: invoiceStatusLabel(l10n, status), tone: invoiceStatusTone(status)),
                ],
              ),
              SizedBox(height: tokens.lg),
              const Divider(height: 1),
              SizedBox(height: tokens.lg),
              _Parties(invoice: invoice, clientName: clientName, wide: wide),
              SizedBox(height: tokens.xl),
              _LineItems(invoice: invoice, wide: wide),
              SizedBox(height: tokens.lg),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 340),
                  child: InvoiceTotalsPanel(
                    totals: InvoiceTotals(subtotal: invoice.subtotalMinor, tax: invoice.taxMinor),
                    taxRate: invoice.taxRate,
                    currency: invoice.currency,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Parties extends StatelessWidget {
  const _Parties({required this.invoice, required this.clientName, required this.wide});

  final Invoice invoice;
  final String clientName;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final eyebrow = text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.8);
    final issued = invoice.issueDate;
    final due = invoice.dueDate;
    final paid = invoice.paidAt;
    final dueLabel = invoiceDueLabel(formats, invoice);

    final billTo = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.invoiceBillTo.toUpperCase(), style: eyebrow),
        SizedBox(height: tokens.xs),
        Text(clientName, style: text.titleMedium),
        Text(invoice.currency, style: text.bodySmall?.copyWith(color: tokens.muted)),
      ],
    );
    final dates = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _DateRow(label: l10n.invoiceIssued, value: issued == null ? l10n.invoiceNotIssued : formats.date(issued)),
        _DateRow(
          label: l10n.invoiceDue,
          value: due == null ? l10n.valueUnknown : formats.date(due),
          hint: dueLabel == null || dueLabel.tone == StatusTone.neutral ? null : dueLabel,
        ),
        if (paid != null) _DateRow(label: l10n.invoicePaid, value: formats.date(paid)),
      ],
    );
    if (!wide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [billTo, SizedBox(height: tokens.lg), dates],
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: billTo),
        SizedBox(width: tokens.xl),
        Expanded(child: dates),
      ],
    );
  }
}

class _DateRow extends StatelessWidget {
  const _DateRow({required this.label, required this.value, this.hint});

  final String label;
  final String value;
  final DueLabel? hint;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final due = hint;
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: text.bodyMedium?.copyWith(color: tokens.muted)),
          ),
          if (due != null) ...[StatusBadge(label: due.label, tone: due.tone, dense: true), SizedBox(width: tokens.sm)],
          Text(value, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _LineItems extends StatelessWidget {
  const _LineItems({required this.invoice, required this.wide});

  static const _quantityFlex = 2;
  static const _unitFlex = 3;
  static const _amountFlex = 3;
  static const _descriptionFlex = 7;

  final Invoice invoice;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final head = text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.8);
    final figures = text.bodyMedium?.copyWith(fontFeatures: _tabular);
    String money(int minor) => invoiceMoney(context, minor, currency: invoice.currency);

    Widget cell(String value, int flex, {TextStyle? style, TextAlign align = TextAlign.end}) => Expanded(
      flex: flex,
      child: Text(value, textAlign: align, style: style ?? figures),
    );

    final rows = <Widget>[
      for (final (i, line) in invoice.lines.indexed) ...[
        if (i > 0) const Divider(height: 1),
        Semantics(
          label: l10n.invoiceLineSemantics(
            line.description,
            line.quantity,
            money(line.unitMinor),
            money(line.amountMinor),
          ),
          excludeSemantics: true,
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.md),
            child: wide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      cell(line.description, _descriptionFlex, style: text.bodyMedium, align: TextAlign.start),
                      cell(context.formats.number(line.quantity), _quantityFlex),
                      cell(money(line.unitMinor), _unitFlex),
                      cell(money(line.amountMinor), _amountFlex, style: figures?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.description, style: text.bodyMedium),
                            SizedBox(height: tokens.xs),
                            Text(
                              l10n.invoiceLineQuantityTimesUnit(
                                context.formats.number(line.quantity),
                                money(line.unitMinor),
                              ),
                              style: text.bodySmall?.copyWith(color: tokens.muted, fontFeatures: _tabular),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: tokens.md),
                      Text(money(line.amountMinor), style: figures?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
          ),
        ),
      ],
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border.symmetric(horizontal: BorderSide(color: tokens.border)),
          ),
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.sm),
            child: wide
                ? Row(
                    children: [
                      cell(
                        l10n.invoiceLineDescription.toUpperCase(),
                        _descriptionFlex,
                        style: head,
                        align: TextAlign.start,
                      ),
                      cell(l10n.invoiceLineQuantity.toUpperCase(), _quantityFlex, style: head),
                      cell(l10n.invoiceLineUnitPrice.toUpperCase(), _unitFlex, style: head),
                      cell(l10n.invoiceLineAmount.toUpperCase(), _amountFlex, style: head),
                    ],
                  )
                : Text(l10n.invoiceLineItems(invoice.lines.length).toUpperCase(), style: head),
          ),
        ),
        if (invoice.lines.isEmpty)
          Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.lg),
            child: Text(l10n.invoiceNoLines, style: text.bodyMedium?.copyWith(color: tokens.muted)),
          )
        else
          ...rows,
        Divider(height: 1, color: tokens.border),
      ],
    );
  }
}

/// Subtotal, tax and total; shared by the document and the form's live preview.
class InvoiceTotalsPanel extends StatelessWidget {
  const InvoiceTotalsPanel({required this.totals, required this.taxRate, this.currency, super.key});

  final InvoiceTotals totals;
  final double taxRate;
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    String money(int minor) => invoiceMoney(context, minor, currency: currency);

    Widget row(String label, String value, {bool strong = false}) => Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: strong ? text.titleMedium : text.bodyMedium?.copyWith(color: tokens.muted)),
          ),
          Text(
            value,
            style: (strong ? text.titleLarge?.copyWith(fontWeight: FontWeight.w700) : text.bodyMedium)?.copyWith(
              fontFeatures: _tabular,
            ),
          ),
        ],
      ),
    );

    return Semantics(
      container: true,
      label: l10n.invoiceTotalsSemantics(money(totals.subtotal), money(totals.tax), money(totals.total)),
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          row(l10n.invoiceSubtotal, money(totals.subtotal)),
          row(l10n.invoiceTax(invoiceTaxRate(context, taxRate)), money(totals.tax)),
          Padding(
            padding: EdgeInsets.symmetric(vertical: tokens.sm),
            child: const Divider(height: 1),
          ),
          row(l10n.invoiceTotal, money(totals.total), strong: true),
        ],
      ),
    );
  }
}
