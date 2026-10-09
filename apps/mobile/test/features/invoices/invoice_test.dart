import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/invoices/domain/invoice.dart';
import 'package:flutter_test/flutter_test.dart';

Invoice _invoice(
  String status, {
  int total = 1000,
  DateTime? dueDate,
  DateTime? paidAt,
}) => Invoice(
  id: 'i-$status-$total',
  clientId: 'c1',
  number: 'INV-2026-0001',
  status: status,
  currency: 'INR',
  taxRate: 18,
  subtotalMinor: total,
  taxMinor: 0,
  totalMinor: total,
  createdAt: DateTime(2026, 9),
  dueDate: dueDate,
  paidAt: paidAt,
);

void main() {
  group('InvoiceTotals', () {
    test('sums line amounts and rounds tax once on the subtotal', () {
      const lines = [
        InvoiceLine(description: 'Design', quantity: 3, unitMinor: 3333),
        InvoiceLine(description: 'Copy', quantity: 1, unitMinor: 1),
      ];
      final totals = InvoiceTotals.of(lines, 18);
      expect(totals.subtotal, 10000);
      expect(totals.tax, 1800);
      expect(totals.total, 11800);
    });

    test('rounds half up like the API', () {
      final totals = InvoiceTotals.of(const [InvoiceLine(description: 'x', quantity: 1, unitMinor: 25)], 10);
      expect(totals.tax, 3); // 2.5 → 3
    });

    test('supports fractional rates and zero tax', () {
      const lines = [InvoiceLine(description: 'x', quantity: 2, unitMinor: 10000)];
      expect(InvoiceTotals.of(lines, 12.5).tax, 2500);
      expect(InvoiceTotals.of(lines, 0).total, 20000);
      expect(InvoiceTotals.of(const [], 18).total, 0);
    });
  });

  group('Invoice', () {
    test('parses the API DTO with the due date as a calendar day', () {
      final invoice = Invoice.fromJson({
        'id': 'i1',
        'clientId': 'c1',
        'number': 'INV-2026-0003',
        'status': 'SENT',
        'currency': 'INR',
        'taxRate': '18',
        'subtotalMinor': 10000,
        'taxMinor': 1800,
        'totalMinor': 11800,
        'issueDate': '2026-10-01T09:30:00.000Z',
        'dueDate': '2026-10-16T00:00:00.000Z',
        'paidAt': null,
        'createdAt': '2026-09-30T10:00:00.000Z',
        'lines': [
          {'id': 'l1', 'description': 'Retainer', 'quantity': 1, 'unitMinor': 10000},
        ],
      });
      expect(invoice.taxRate, 18);
      expect(invoice.dueDate, DateTime(2026, 10, 16));
      expect(invoice.lines.single.amountMinor, 10000);
      expect(invoice.isDraft, isFalse);
    });

    test('falls back to draft for an unknown status', () {
      expect(Invoice.fromJson({'status': 'ARCHIVED'}).status, InvoiceStatuses.draft);
    });

    test('a sent invoice past its due date reads as overdue', () {
      final invoice = _invoice(InvoiceStatuses.sent, dueDate: DateTime(2026, 10, 8));
      expect(invoice.effectiveStatus(DateTime(2026, 10, 8, 23)), InvoiceStatuses.sent);
      expect(invoice.effectiveStatus(DateTime(2026, 10, 9, 1)), InvoiceStatuses.overdue);
    });

    test('drafts and paid invoices never become overdue', () {
      final past = DateTime(2020);
      expect(_invoice(InvoiceStatuses.draft, dueDate: past).effectiveStatus(), InvoiceStatuses.draft);
      expect(_invoice(InvoiceStatuses.paid, dueDate: past).effectiveStatus(), InvoiceStatuses.paid);
    });

    test('next statuses follow the contract transition table', () {
      expect(_invoice(InvoiceStatuses.draft).nextStatuses, [InvoiceStatuses.sent, InvoiceStatuses.voidValue]);
      expect(_invoice(InvoiceStatuses.sent).nextStatuses, [InvoiceStatuses.paid, InvoiceStatuses.voidValue]);
      expect(_invoice(InvoiceStatuses.overdue).nextStatuses, [InvoiceStatuses.paid, InvoiceStatuses.voidValue]);
      expect(_invoice(InvoiceStatuses.paid).nextStatuses, isEmpty);
      expect(_invoice(InvoiceStatuses.voidValue).nextStatuses, isEmpty);
      expect(_invoice(InvoiceStatuses.paid).isSettled, isTrue);
    });
  });

  group('InvoiceInput', () {
    test('serialises the due date as a date key and omits absent fields', () {
      final json = InvoiceInput(
        clientId: 'c1',
        dueDate: DateTime(2026, 10, 24),
        taxRate: 18,
        lines: const [InvoiceLine(description: 'x', quantity: 2, unitMinor: 500)],
      ).toJson();
      expect(json['dueDate'], '2026-10-24');
      expect(json.containsKey('number'), isFalse);
      expect(json.containsKey('status'), isFalse);
      expect(json['lines'], [
        {'description': 'x', 'quantity': 2, 'unitMinor': 500},
      ]);
    });
  });

  group('InvoiceSummary', () {
    test('splits outstanding, overdue, paid this month and drafts', () {
      final now = DateTime(2026, 10, 9);
      final summary = InvoiceSummary.of([
        _invoice(InvoiceStatuses.sent, total: 100, dueDate: DateTime(2026, 10, 20)),
        _invoice(InvoiceStatuses.sent, total: 200, dueDate: DateTime(2026, 10, 1)),
        _invoice(InvoiceStatuses.overdue, total: 400),
        _invoice(InvoiceStatuses.paid, total: 800, paidAt: DateTime(2026, 10, 2)),
        _invoice(InvoiceStatuses.paid, total: 1600, paidAt: DateTime(2026, 9, 30)),
        _invoice(InvoiceStatuses.draft, total: 3200),
        _invoice(InvoiceStatuses.voidValue, total: 6400),
      ], now: now);
      expect(summary.outstanding, 700);
      expect(summary.overdue, 600);
      expect(summary.overdueCount, 2);
      expect(summary.paidThisMonth, 800);
      expect(summary.drafts, 3200);
      expect(summary.draftCount, 1);
    });
  });

  group('InvoiceNumbering', () {
    test('continues the highest sequence of the current year', () {
      final next = InvoiceNumbering.next(
        ['INV-2026-0007', 'INV-2026-0012', 'INV-2025-0099', 'CUSTOM-1'],
        now: DateTime(2026, 10, 9),
      );
      expect(next, 'INV-2026-0013');
    });

    test('starts at 0001 in a new year', () {
      expect(InvoiceNumbering.next(['INV-2025-0042'], now: DateTime(2026)), 'INV-2026-0001');
    });
  });

  group('amount parsing', () {
    test('parses major units into minor units', () {
      expect(parseMajorToMinor('1250.50'), 125050);
      expect(parseMajorToMinor('1,250.50'), 125050);
      expect(parseMajorToMinor('99,5'), 9950);
      expect(parseMajorToMinor(' 12 '), 1200);
      expect(parseMajorToMinor('0.015'), 2);
    });

    test('rejects empty, negative and non-numeric input', () {
      expect(parseMajorToMinor(''), isNull);
      expect(parseMajorToMinor('-5'), isNull);
      expect(parseMajorToMinor('abc'), isNull);
      expect(parseDecimalInput('1,2,3'), 123);
    });

    test('checks decimal places', () {
      expect(hasAtMostDecimals(18, 2), isTrue);
      expect(hasAtMostDecimals(12.75, 2), isTrue);
      // Binary float noise on 0.1+0.2 must still count as two decimals.
      expect(hasAtMostDecimals(0.1 + 0.2, 2), isTrue);
      expect(hasAtMostDecimals(12.345, 2), isFalse);
    });
  });
}
