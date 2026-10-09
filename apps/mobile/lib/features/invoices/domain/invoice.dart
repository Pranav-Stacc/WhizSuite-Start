import 'dart:math' as math;

import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/network/api_client.dart';
import 'calendar_date.dart';

/// Invoice arithmetic in minor units, mirroring the contract's `computeInvoiceTotals`:
/// tax is rounded once on the subtotal.
class InvoiceTotals {
  const InvoiceTotals({required this.subtotal, required this.tax});

  factory InvoiceTotals.of(Iterable<InvoiceLine> lines, double taxRate) {
    final subtotal = lines.fold(0, (sum, line) => sum + line.amountMinor);
    return InvoiceTotals(subtotal: subtotal, tax: (subtotal * taxRate / _percent).round());
  }

  static const _percent = 100;

  final int subtotal;
  final int tax;

  int get total => subtotal + tax;
}

class InvoiceLine {
  const InvoiceLine({required this.description, required this.quantity, required this.unitMinor});

  factory InvoiceLine.fromJson(Json json) => InvoiceLine(
    description: json.str('description'),
    quantity: json.integer('quantity'),
    unitMinor: json.integer('unitMinor'),
  );

  final String description;
  final int quantity;

  /// Unit price in minor currency units.
  final int unitMinor;

  int get amountMinor => quantity * unitMinor;

  Json toJson() => {'description': description, 'quantity': quantity, 'unitMinor': unitMinor};
}

class Invoice {
  const Invoice({
    required this.id,
    required this.clientId,
    required this.number,
    required this.status,
    required this.currency,
    required this.taxRate,
    required this.subtotalMinor,
    required this.taxMinor,
    required this.totalMinor,
    required this.createdAt,
    this.issueDate,
    this.dueDate,
    this.paidAt,
    this.lines = const [],
  });

  factory Invoice.fromJson(Json json) {
    final status = json.str('status');
    return Invoice(
      id: json.str('id'),
      clientId: json.str('clientId'),
      number: json.str('number'),
      status: InvoiceStatuses.values.contains(status) ? status : InvoiceStatuses.draft,
      currency: json.str('currency'),
      taxRate: json.decimal('taxRate'),
      subtotalMinor: json.integer('subtotalMinor'),
      taxMinor: json.integer('taxMinor'),
      totalMinor: json.integer('totalMinor'),
      createdAt: json.date('createdAt') ?? DateTime.now(),
      issueDate: json.date('issueDate'),
      dueDate: calendarDate(json, 'dueDate'),
      paidAt: json.date('paidAt'),
      lines: json.objects('lines').map(InvoiceLine.fromJson).toList(),
    );
  }

  final String id;
  final String clientId;
  final String number;

  /// Status as stored by the API.
  final String status;
  final String currency;

  /// Percentage, e.g. 18 for 18%.
  final double taxRate;
  final int subtotalMinor;
  final int taxMinor;
  final int totalMinor;
  final DateTime createdAt;

  /// Set when the invoice is sent; drafts have none.
  final DateTime? issueDate;
  final DateTime? dueDate;
  final DateTime? paidAt;
  final List<InvoiceLine> lines;

  bool get isDraft => status == InvoiceStatuses.draft;

  /// Paid and void invoices are settled; their due date no longer matters.
  bool get isSettled => status == InvoiceStatuses.paid || status == InvoiceStatuses.voidValue;

  /// Issue date for display and sorting; drafts fall back to when they were created.
  DateTime get displayDate => issueDate ?? createdAt;

  /// A sent invoice past its due date reads as overdue even before the API flips it.
  String effectiveStatus([DateTime? now]) {
    final due = dueDate;
    if (status != InvoiceStatuses.sent || due == null) return status;
    final today = _day(now ?? DateTime.now());
    return due.isBefore(today) ? InvoiceStatuses.overdue : status;
  }

  /// Statuses the API accepts next, per the contract's transition table.
  List<String> get nextStatuses => invoiceTransitions[status] ?? const [];

  static DateTime _day(DateTime value) => DateTime(value.year, value.month, value.day);
}

/// Fields an invoice form edits. The number can only be set on create.
class InvoiceInput {
  const InvoiceInput({
    required this.clientId,
    required this.dueDate,
    required this.taxRate,
    required this.lines,
    this.number,
    this.status,
  });

  final String clientId;
  final DateTime dueDate;
  final double taxRate;
  final List<InvoiceLine> lines;
  final String? number;
  final String? status;

  Json toJson() => {
    'clientId': clientId,
    'number': ?number,
    'status': ?status,
    'dueDate': dateKey(dueDate),
    'taxRate': taxRate,
    'lines': [for (final line in lines) line.toJson()],
  };
}

/// Receivables summary across a set of invoices, in minor units.
class InvoiceSummary {
  const InvoiceSummary({
    this.outstanding = 0,
    this.overdue = 0,
    this.paidThisMonth = 0,
    this.drafts = 0,
    this.overdueCount = 0,
    this.draftCount = 0,
  });

  factory InvoiceSummary.of(Iterable<Invoice> invoices, {DateTime? now}) {
    final today = now ?? DateTime.now();
    var outstanding = 0, overdue = 0, paid = 0, drafts = 0, overdueCount = 0, draftCount = 0;
    for (final invoice in invoices) {
      final status = invoice.effectiveStatus(today);
      final paidAt = invoice.paidAt?.toLocal();
      switch (status) {
        case InvoiceStatuses.sent:
          outstanding += invoice.totalMinor;
        case InvoiceStatuses.overdue:
          outstanding += invoice.totalMinor;
          overdue += invoice.totalMinor;
          overdueCount++;
        case InvoiceStatuses.draft:
          drafts += invoice.totalMinor;
          draftCount++;
        case InvoiceStatuses.paid when paidAt != null && paidAt.year == today.year && paidAt.month == today.month:
          paid += invoice.totalMinor;
      }
    }
    return InvoiceSummary(
      outstanding: outstanding,
      overdue: overdue,
      paidThisMonth: paid,
      drafts: drafts,
      overdueCount: overdueCount,
      draftCount: draftCount,
    );
  }

  final int outstanding;
  final int overdue;
  final int paidThisMonth;
  final int drafts;
  final int overdueCount;
  final int draftCount;
}

/// Invoice numbering convention shared with the web: `INV-2026-0008`.
abstract final class InvoiceNumbering {
  static const prefix = 'INV';
  static const sequencePad = 4;

  /// Next sequential number for [now]'s year, after the highest one already used.
  static String next(Iterable<String> existing, {DateTime? now}) {
    final yearPrefix = '$prefix-${(now ?? DateTime.now()).year}-';
    var highest = 0;
    for (final number in existing) {
      if (!number.startsWith(yearPrefix)) continue;
      final sequence = int.tryParse(number.substring(yearPrefix.length));
      if (sequence != null && sequence > highest) highest = sequence;
    }
    return '$yearPrefix${(highest + 1).toString().padLeft(sequencePad, '0')}';
  }
}

/// Numeric bounds the API enforces beyond the contract limits.
abstract final class InvoiceLimits {
  /// Largest amount the API stores (a PostgreSQL `integer`), in minor units.
  static const maxMinor = 2147483647;

  /// The API accepts tax rates with at most this many decimals.
  static const taxRateDecimals = 2;
}

/// Parses an amount typed in major units ("1,250.50", "99,5") into minor units; null when invalid.
int? parseMajorToMinor(String raw) {
  final value = parseDecimalInput(raw);
  if (value == null || value < 0) return null;
  return (value * AppFormats.minorUnitsPerMajor).round();
}

/// Lenient decimal parsing for typed numbers: accepts a dot or a lone comma as the decimal mark.
double? parseDecimalInput(String raw) {
  var text = raw.trim().replaceAll(' ', '');
  if (text.isEmpty) return null;
  final commas = ','.allMatches(text).length;
  text = !text.contains('.') && commas == 1 ? text.replaceAll(',', '.') : text.replaceAll(',', '');
  return double.tryParse(text);
}

/// Whether [value] has at most [decimals] fractional digits.
bool hasAtMostDecimals(double value, int decimals) {
  final scaled = value * math.pow(10, decimals);
  return (scaled - scaled.round()).abs() < _epsilon;
}

const _epsilon = 1e-6;

/// Defaults for new invoices, matching the web form.
abstract final class InvoiceDefaults {
  static const taxRate = 18.0;
  static const paymentTermsDays = 15;
  static const status = InvoiceStatuses.draft;
}
