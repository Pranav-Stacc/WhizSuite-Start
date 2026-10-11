import '../../../l10n/app_localizations.dart';
import '../domain/workflow.dart';

String workflowBasisLabel(AppLocalizations l10n, String basis) => switch (basis) {
      ApproverBases.person => l10n.workflowBasisPerson,
      ApproverBases.designation => l10n.workflowBasisDesignation,
      ApproverBases.department => l10n.workflowBasisDepartment,
      ApproverBases.client => l10n.workflowBasisClient,
      ApproverBases.clientContact => l10n.workflowBasisClientContact,
      ApproverBases.project => l10n.workflowBasisProject,
      ApproverBases.assignee => l10n.workflowBasisAssignee,
      _ => l10n.workflowBasisRole,
    };
