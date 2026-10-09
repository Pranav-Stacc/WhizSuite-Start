import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/widgets/status_badge.dart';

/// Status tones for the entities the overview screens summarise, matching the web palette.

StatusTone taskStatusTone(String status) => switch (status) {
      TaskStatuses.inProgress => StatusTone.info,
      TaskStatuses.inReview => StatusTone.violet,
      TaskStatuses.done => StatusTone.success,
      _ => StatusTone.neutral,
    };

StatusTone contentStatusTone(String status) => switch (status) {
      ContentStatuses.inReview => StatusTone.info,
      ContentStatuses.changesRequested => StatusTone.warning,
      ContentStatuses.approved => StatusTone.success,
      ContentStatuses.scheduled => StatusTone.violet,
      ContentStatuses.published => StatusTone.success,
      _ => StatusTone.neutral,
    };

StatusTone invoiceStatusTone(String status) => switch (status) {
      InvoiceStatuses.sent => StatusTone.info,
      InvoiceStatuses.paid => StatusTone.success,
      InvoiceStatuses.overdue => StatusTone.danger,
      _ => StatusTone.neutral,
    };

StatusTone approvalStatusTone(String status) => switch (status) {
      ApprovalStatuses.pending => StatusTone.warning,
      ApprovalStatuses.approved => StatusTone.success,
      ApprovalStatuses.rejected => StatusTone.danger,
      ApprovalStatuses.changesRequested => StatusTone.warning,
      _ => StatusTone.neutral,
    };

StatusTone reportStatusTone(String status) => switch (status) {
      ReportStatuses.ready => StatusTone.info,
      ReportStatuses.sent => StatusTone.success,
      _ => StatusTone.neutral,
    };

StatusTone clientStatusToneOf(String status) => switch (status) {
      ClientStatuses.active => StatusTone.success,
      ClientStatuses.onboarding => StatusTone.info,
      ClientStatuses.paused => StatusTone.warning,
      ClientStatuses.churned => StatusTone.danger,
      _ => StatusTone.neutral,
    };

StatusTone projectStatusTone(String status) => switch (status) {
      ProjectStatuses.active => StatusTone.success,
      ProjectStatuses.planning => StatusTone.info,
      ProjectStatuses.onHold => StatusTone.warning,
      _ => StatusTone.neutral,
    };
