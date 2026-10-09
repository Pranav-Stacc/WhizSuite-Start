import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../content/content_routes.dart';
import '../domain/approval.dart';

String approvalStatusLabel(AppLocalizations l10n, String status) => l10n.approvalStatus(status);

String approvalSubjectTypeLabel(AppLocalizations l10n, String type) => l10n.approvalSubjectType(type);

String approvalRuleLabel(AppLocalizations l10n, String rule) => l10n.approvalRule(rule);

String approvalActionLabel(AppLocalizations l10n, String action) => l10n.approvalActionLabel(action);

StatusTone approvalStatusTone(String status) => switch (status) {
      ApprovalStatuses.pending => StatusTone.warning,
      ApprovalStatuses.approved => StatusTone.success,
      ApprovalStatuses.rejected => StatusTone.danger,
      ApprovalStatuses.changesRequested => StatusTone.warning,
      _ => StatusTone.neutral,
    };

StatusTone approvalActionTone(String action) => switch (action) {
      ApprovalActions.approved => StatusTone.success,
      ApprovalActions.rejected => StatusTone.danger,
      ApprovalActions.changesRequested => StatusTone.warning,
      _ => StatusTone.neutral,
    };

/// Display title for a request: resolved subject name, else a typed fallback.
String approvalTitle(AppLocalizations l10n, ApprovalRequest request, {String? subjectTitle}) {
  final title = subjectTitle?.trim();
  if (title != null && title.isNotEmpty) return title;
  return l10n.approvalSubjectFallback(approvalSubjectTypeLabel(l10n, request.subjectType));
}

/// Deep link into the owning feature when we know how to open [subjectType].
String? approvalSubjectRoute(ApprovalRequest request) {
  final type = request.subjectType.trim().toUpperCase();
  if (type == FeedbackSubjectTypes.content) return ContentRoutes.detail(request.subjectId);
  return null;
}
