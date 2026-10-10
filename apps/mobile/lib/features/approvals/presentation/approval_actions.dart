import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/approvals_controller.dart';
import '../domain/approval.dart';

/// Approve immediately (optional confirm), or open a sheet for reject / changes with a comment.
Future<bool> decideApproval(
  BuildContext context,
  WidgetRef ref,
  ApprovalRequest approval, {
  required String action,
}) async {
  final l10n = AppLocalizations.of(context);
  if (action == ApprovalActions.approved) {
    final confirmed = await confirmAction(
      context,
      title: l10n.approvalApproveConfirmTitle,
      body: l10n.approvalApproveConfirmBody,
      confirmLabel: l10n.approvalActionApprove,
    );
    if (!confirmed || !context.mounted) return false;
    return runAction(
      context,
      () => ref.read(approvalsActionsProvider).act(approval.id, action: action),
      success: l10n.approvalApprovedToast,
    );
  }

  final needsComment = action == ApprovalActions.changesRequested || action == ApprovalActions.rejected;
  final comment = TextEditingController();
  final rejecting = action == ApprovalActions.rejected;
  final saved = await showFormSheet(
    context,
    title: rejecting ? l10n.approvalRejectTitle : l10n.approvalChangesTitle,
    subtitle: rejecting ? l10n.approvalCommentHint : l10n.approvalCommentRequiredHint,
    submitLabel: rejecting ? l10n.approvalActionReject : l10n.approvalActionRequestChanges,
    size: AppDialogSize.compact,
    fields: (context, _) => [
      TextFormField(
        controller: comment,
        autofocus: true,
        minLines: 3,
        maxLines: 6,
        maxLength: feedbackCommentMaxLengthDefault,
        decoration: InputDecoration(
          labelText: l10n.approvalComment,
          hintText: rejecting ? l10n.approvalCommentHint : l10n.approvalCommentRequiredHint,
        ),
        validator: needsComment && action == ApprovalActions.changesRequested
            ? Validators(AppLocalizations.of(context)).required
            : null,
      ),
    ],
    onSubmit: () => ref.read(approvalsActionsProvider).act(
          approval.id,
          action: action,
          comment: comment.text,
        ),
  );
  if (saved && context.mounted) {
    showToast(
      context,
      rejecting ? l10n.approvalRejectedToast : l10n.approvalChangesToast,
    );
  }
  return saved;
}
