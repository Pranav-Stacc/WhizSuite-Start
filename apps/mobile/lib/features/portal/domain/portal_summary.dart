import '../../../core/contracts/contracts.g.dart';
import 'portal_models.dart';

/// Rows shown in each portal section before "View all".
const int portalListLimit = 5;

/// Aggregates the client portal home from list endpoints the member may already call.
class PortalSummary {
  const PortalSummary({
    required this.approvals,
    required this.openInvoices,
    required this.openThreads,
    required this.activeProjects,
    required this.recentContent,
    required this.openInvoiceRows,
    required this.approvalRows,
    required this.projectRows,
    required this.threadRows,
  });

  factory PortalSummary.of({
    required List<PortalContent> content,
    required List<PortalInvoice> invoices,
    required List<PortalProject> projects,
    required List<PortalThread> threads,
    required DateTime now,
  }) {
    final visible = content.where((c) => c.isClientVisible).toList()
      ..sort((a, b) => (b.updatedAt ?? now).compareTo(a.updatedAt ?? now));
    final approvals = visible.where((c) => c.awaitingReview).toList()
      ..sort((a, b) {
        final as = a.scheduledAt;
        final bs = b.scheduledAt;
        if (as != null && bs != null) return as.compareTo(bs);
        if (as != null) return -1;
        if (bs != null) return 1;
        return (a.updatedAt ?? now).compareTo(b.updatedAt ?? now);
      });
    final openInvoices = invoices.where((i) => i.isOpen(now)).toList()
      ..sort((a, b) => (a.dueDate ?? now).compareTo(b.dueDate ?? now));
    final openThreads = threads.where((t) => t.isOpen).toList()
      ..sort((a, b) => (b.updatedAt ?? now).compareTo(a.updatedAt ?? now));
    final activeProjects = projects.where((p) => p.isActive).toList()
      ..sort((a, b) => a.name.compareTo(b.name));

    return PortalSummary(
      approvals: approvals.length,
      openInvoices: openInvoices.length,
      openThreads: openThreads.length,
      activeProjects: activeProjects.length,
      recentContent: visible
          .where((c) =>
              c.status == ContentStatuses.scheduled ||
              c.status == ContentStatuses.published ||
              c.status == ContentStatuses.approved)
          .take(portalListLimit)
          .toList(),
      openInvoiceRows: openInvoices.take(portalListLimit).toList(),
      approvalRows: approvals.take(portalListLimit).toList(),
      projectRows: activeProjects.take(portalListLimit).toList(),
      threadRows: openThreads.take(portalListLimit).toList(),
    );
  }

  final int approvals;
  final int openInvoices;
  final int openThreads;
  final int activeProjects;
  final List<PortalContent> recentContent;
  final List<PortalInvoice> openInvoiceRows;
  final List<PortalContent> approvalRows;
  final List<PortalProject> projectRows;
  final List<PortalThread> threadRows;
}
