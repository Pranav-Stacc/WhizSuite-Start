import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/invoice.dart';

String invoiceStatusLabel(AppLocalizations l10n, String status) => l10n.invoiceStatus(status);

StatusTone invoiceStatusTone(String status) => switch (status) {
  InvoiceStatuses.draft => StatusTone.neutral,
  InvoiceStatuses.sent => StatusTone.info,
  InvoiceStatuses.paid => StatusTone.success,
  InvoiceStatuses.overdue => StatusTone.danger,
  InvoiceStatuses.voidValue => StatusTone.warning,
  _ => StatusTone.neutral,
};

/// Due wording for an invoice; settled invoices read as their plain due date.
DueLabel? invoiceDueLabel(AppFormats formats, Invoice invoice) {
  final due = invoice.dueDate;
  if (due == null) return null;
  if (invoice.isSettled) return (label: formats.shortDate(due), tone: StatusTone.neutral);
  return formats.due(due);
}

/// Exact money with minor units, for invoice documents where rounding to whole units would misstate amounts.
String invoiceMoney(BuildContext context, int minor, {String? currency}) {
  final code = (currency == null || currency.isEmpty) ? context.formats.currency : currency;
  final locale = Localizations.localeOf(context).toLanguageTag();
  return NumberFormat.simpleCurrency(locale: locale, name: code).format(minor / AppFormats.minorUnitsPerMajor);
}

/// Tax rate number without trailing zeros ("18", "12.5"); the message adds the percent sign.
String invoiceTaxRate(BuildContext context, double rate) {
  final locale = Localizations.localeOf(context).toLanguageTag();
  return NumberFormat('#,##0.##', locale).format(rate);
}
