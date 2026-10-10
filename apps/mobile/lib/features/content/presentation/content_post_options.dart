import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/feedback.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../approvals/application/approvals_controller.dart';
import '../../approvals/approvals_routes.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/content_workflow.dart';
import 'content_actions_ui.dart';
import 'content_labels.dart';

/// Quick actions for a post from the library or planner.
Future<void> showContentPostOptions(
  BuildContext context,
  WidgetRef ref, {
  required Content content,
}) async {
  final l10n = AppLocalizations.of(context);
  final policy = ref.read(accessPolicyProvider);
  final canEdit = policy.can(Permissions.contentEdit) && isContentEditable(content.status);
  final canApprove = policy.can(Permissions.approvalsApprove);
  final canSchedule = policy.can(Permissions.socialSchedule);
  final moves = contentMovesFrom(content.status);
  final approval = ref.read(pendingContentApprovalProvider(content.id));
  final title = content.title.isEmpty ? l10n.contentUntitled : content.title;

  final action = await showModalBottomSheet<_PostOption>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                ContentStatusBadge(status: content.status, dense: true),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.open_in_new_outlined),
            title: Text(l10n.contentOpenPost),
            onTap: () => Navigator.pop(context, _PostOption.open),
          ),
          if (canEdit)
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text(l10n.contentEditTitle),
              onTap: () => Navigator.pop(context, _PostOption.edit),
            ),
          if (content.status == ContentStatuses.inReview && canApprove) ...[
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text(l10n.contentActionApprove),
              onTap: () => Navigator.pop(context, _PostOption.approve),
            ),
            ListTile(
              leading: const Icon(Icons.rate_review_outlined),
              title: Text(l10n.contentActionRequestChanges),
              onTap: () => Navigator.pop(context, _PostOption.requestChanges),
            ),
            ListTile(
              leading: const Icon(Icons.cancel_outlined),
              title: Text(l10n.contentActionReject),
              onTap: () => Navigator.pop(context, _PostOption.reject),
            ),
          ],
          for (final move in moves)
            if (_moveOption(move, canApprove: canApprove, canSchedule: canSchedule) case final option?)
              ListTile(
                leading: Icon(_moveIcon(move.kind)),
                title: Text(_moveLabel(l10n, move)),
                onTap: () => Navigator.pop(context, option),
              ),
          if (approval != null && policy.can(Permissions.approvalsView))
            ListTile(
              leading: const Icon(Icons.fact_check_outlined),
              title: Text(l10n.contentOpenApproval),
              onTap: () => Navigator.pop(context, _PostOption.openApproval),
            ),
          ListTile(
            leading: const Icon(Icons.alarm_outlined),
            title: Text(l10n.contentSetReminder),
            subtitle: Text(l10n.contentSetReminderBody),
            onTap: () => Navigator.pop(context, _PostOption.reminder),
          ),
          ListTile(
            leading: const Icon(Icons.link_outlined),
            title: Text(l10n.contentCopyLink),
            onTap: () => Navigator.pop(context, _PostOption.copyLink),
          ),
          ListTile(
            leading: const Icon(Icons.ios_share_outlined),
            title: Text(l10n.contentShare),
            onTap: () => Navigator.pop(context, _PostOption.share),
          ),
          if (canEdit)
            ListTile(
              leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
              title: Text(l10n.delete, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              onTap: () => Navigator.pop(context, _PostOption.delete),
            ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );

  if (!context.mounted || action == null) return;

  switch (action) {
    case _PostOption.open:
      await context.push(ContentRoutes.detail(content.id));
    case _PostOption.edit:
      await context.push(ContentRoutes.edit(content.id));
    case _PostOption.approve:
      await runAction(
        context,
        () => ref.read(contentActionsProvider).review(content.id, ContentReviewOutcomes.approved),
        success: l10n.contentApprovedToast,
      );
    case _PostOption.requestChanges:
      final withNote = policy.can(Permissions.feedbackCreate);
      final saved = await showReviewSheet(
        context,
        ref,
        content: content,
        outcome: ContentReviewOutcomes.changesRequested,
        withNote: withNote,
      );
      if (saved && context.mounted) showToast(context, l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.changesRequested)));
    case _PostOption.reject:
      final withNote = policy.can(Permissions.feedbackCreate);
      final saved = await showReviewSheet(
        context,
        ref,
        content: content,
        outcome: ContentReviewOutcomes.draft,
        withNote: withNote,
      );
      if (saved && context.mounted) showToast(context, l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.draft)));
    case _PostOption.submit:
      await runAction(
        context,
        () => ref.read(contentActionsProvider).transition(content.id, ContentStatuses.inReview),
        success: l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.inReview)),
      );
    case _PostOption.schedule:
      final saved = await showScheduleSheet(context, ref, content, markScheduled: true);
      if (saved && context.mounted) showToast(context, l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.scheduled)));
    case _PostOption.unschedule:
      await runAction(
        context,
        () => ref.read(contentActionsProvider).transition(content.id, ContentStatuses.approved),
        success: l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.approved)),
      );
    case _PostOption.publish:
      final confirmed = await confirmAction(
        context,
        title: l10n.contentPublishConfirmTitle,
        body: l10n.contentPublishConfirmBody,
        confirmLabel: l10n.contentActionPublish,
      );
      if (!confirmed || !context.mounted) return;
      await runAction(
        context,
        () => ref.read(contentActionsProvider).transition(content.id, ContentStatuses.published),
        success: l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.published)),
      );
    case _PostOption.withdraw:
      await runAction(
        context,
        () => ref.read(contentActionsProvider).transition(content.id, ContentStatuses.draft),
        success: l10n.contentMovedToast(contentStatusLabel(l10n, ContentStatuses.draft)),
      );
    case _PostOption.reminder:
      final saved = await showScheduleSheet(context, ref, content, markScheduled: content.status == ContentStatuses.approved);
      if (saved && context.mounted) showToast(context, l10n.contentReminderSet);
    case _PostOption.openApproval:
      if (approval != null) await context.push(ApprovalsRoutes.detail(approval.id));
    case _PostOption.copyLink:
      await Clipboard.setData(ClipboardData(text: ContentRoutes.shareUrl(content.id)));
      if (context.mounted) showToast(context, l10n.contentLinkCopied);
    case _PostOption.share:
      final clientName = ref.read(clientDirectoryProvider).value?.nameOf(content.clientId) ?? l10n.valueUnknown;
      final summary = l10n.contentShareText(title, clientName, ContentRoutes.shareUrl(content.id));
      await Clipboard.setData(ClipboardData(text: summary));
      if (context.mounted) showToast(context, l10n.contentShareCopied);
    case _PostOption.delete:
      final confirmed = await confirmAction(
        context,
        title: l10n.deleteConfirmTitle(title),
        body: l10n.deleteConfirmBody,
        confirmLabel: l10n.delete,
        destructive: true,
      );
      if (!confirmed || !context.mounted) return;
      await runAction(context, () => ref.read(contentActionsProvider).delete(content.id), success: l10n.deletedToast);
  }
}

enum _PostOption {
  open,
  edit,
  approve,
  requestChanges,
  reject,
  submit,
  schedule,
  unschedule,
  publish,
  withdraw,
  reminder,
  openApproval,
  copyLink,
  share,
  delete,
}

_PostOption? _moveOption(ContentMove move, {required bool canApprove, required bool canSchedule}) {
  if (move.approverOnly && !canApprove) return null;
  if ((move.kind == ContentMoveKind.schedule || move.kind == ContentMoveKind.unschedule) && !canSchedule) return null;
  return switch (move.kind) {
    ContentMoveKind.submit => _PostOption.submit,
    ContentMoveKind.schedule => _PostOption.schedule,
    ContentMoveKind.unschedule => _PostOption.unschedule,
    ContentMoveKind.publish => _PostOption.publish,
    ContentMoveKind.withdraw => _PostOption.withdraw,
    ContentMoveKind.backToDraft => _PostOption.withdraw,
  };
}

IconData _moveIcon(ContentMoveKind kind) => switch (kind) {
      ContentMoveKind.submit => Icons.send_outlined,
      ContentMoveKind.schedule => Icons.schedule_outlined,
      ContentMoveKind.unschedule => Icons.event_busy_outlined,
      ContentMoveKind.publish => Icons.rocket_launch_outlined,
      ContentMoveKind.withdraw => Icons.undo_outlined,
      ContentMoveKind.backToDraft => Icons.drafts_outlined,
    };

String _moveLabel(AppLocalizations l10n, ContentMove move) => switch (move.kind) {
      ContentMoveKind.submit => l10n.contentActionSubmit,
      ContentMoveKind.schedule => l10n.contentActionSchedule,
      ContentMoveKind.unschedule => l10n.contentActionUnschedule,
      ContentMoveKind.publish => l10n.contentActionPublish,
      ContentMoveKind.withdraw => l10n.contentActionWithdraw,
      ContentMoveKind.backToDraft => l10n.contentActionBackToDraft,
    };
