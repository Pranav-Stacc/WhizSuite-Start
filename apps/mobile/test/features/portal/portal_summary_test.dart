import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/portal/domain/portal_models.dart';
import 'package:agency_os/features/portal/domain/portal_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 10, 9);

  group('PortalSummary.of', () {
    test('counts approvals, open invoices, open threads and active projects', () {
      final summary = PortalSummary.of(
        content: [
          const PortalContent(id: '1', title: 'A', status: ContentStatuses.inReview),
          const PortalContent(id: '2', title: 'B', status: ContentStatuses.draft),
          const PortalContent(id: '3', title: 'C', status: ContentStatuses.published),
        ],
        invoices: [
          PortalInvoice(
            id: 'i1',
            number: 'INV-1',
            status: InvoiceStatuses.sent,
            currency: 'USD',
            totalMinor: 1000,
            dueDate: DateTime(2026, 10, 15),
          ),
          const PortalInvoice(
            id: 'i2',
            number: 'INV-2',
            status: InvoiceStatuses.paid,
            currency: 'USD',
            totalMinor: 500,
          ),
          PortalInvoice(
            id: 'i3',
            number: 'INV-3',
            status: InvoiceStatuses.sent,
            currency: 'USD',
            totalMinor: 200,
            dueDate: DateTime(2026, 10, 1),
          ),
        ],
        projects: const [
          PortalProject(id: 'p1', name: 'Active', status: ProjectStatuses.active),
          PortalProject(id: 'p2', name: 'Done', status: ProjectStatuses.completed),
        ],
        threads: [
          PortalThread(
            id: 't1',
            subjectType: FeedbackSubjectTypes.client,
            subjectId: 'c1',
            status: FeedbackThreadStatuses.open,
            updatedAt: DateTime(2026, 10, 8),
          ),
          const PortalThread(
            id: 't2',
            subjectType: FeedbackSubjectTypes.client,
            subjectId: 'c1',
            status: FeedbackThreadStatuses.resolved,
          ),
        ],
        now: now,
      );

      expect(summary.approvals, 1);
      expect(summary.openInvoices, 2);
      expect(summary.openInvoiceRows.first.number, 'INV-3');
      expect(summary.openThreads, 1);
      expect(summary.activeProjects, 1);
      expect(summary.recentContent.map((c) => c.id), ['3']);
      expect(summary.approvalRows.single.id, '1');
    });

    test('treats past-due sent invoices as open/overdue', () {
      final invoice = PortalInvoice(
        id: 'i1',
        number: 'INV-1',
        status: InvoiceStatuses.sent,
        currency: 'EUR',
        totalMinor: 100,
        dueDate: DateTime(2026, 10, 1),
      );
      expect(invoice.effectiveStatus(now), InvoiceStatuses.overdue);
      expect(invoice.isOpen(now), isTrue);
    });
  });
}
