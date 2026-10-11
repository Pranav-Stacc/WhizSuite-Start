import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../team/application/team_controller.dart';
import '../../team/domain/member.dart';
import '../application/content_controller.dart';
import '../domain/content.dart';
import '../domain/content_approval_summary.dart';
import '../domain/content_workflow.dart';
import 'content_actions_ui.dart';
import 'content_labels.dart';

/// Where the post is in its workflow and the next steps the member may take.
class ContentWorkflowPanel extends ConsumerWidget {
  const ContentWorkflowPanel({required this.content, super.key});

  final Content content;

  static List<String> _requirements(ContentMove move) => [
        Permissions.contentEdit,
        if (move.approverOnly) Permissions.approvalsApprove,
        if (move.kind == ContentMoveKind.schedule || move.kind == ContentMoveKind.unschedule) Permissions.socialSchedule,
      ];

  Future<void> _run(BuildContext context, WidgetRef ref, ContentMove move) async {
    final l10n = AppLocalizations.of(context);
    if (move.needsSchedule(content.scheduledAt)) {
      final saved = await showScheduleSheet(context, ref, content, markScheduled: true);
      if (saved && context.mounted) showToast(context, l10n.contentMovedToast(contentStatusLabel(l10n, move.target)));
      return;
    }
    if (move.kind == ContentMoveKind.publish) {
      final confirmed = await confirmAction(
        context,
        title: l10n.contentPublishConfirmTitle,
        body: l10n.contentPublishConfirmBody,
        confirmLabel: l10n.contentActionPublish,
      );
      if (!confirmed || !context.mounted) return;
    }
    await runAction(
      context,
      () => ref.read(contentActionsProvider).transition(content.id, move.target),
      success: l10n.contentMovedToast(contentStatusLabel(l10n, move.target)),
    );
  }

  Future<void> _approve(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(contentActionsProvider).review(content.id, ContentReviewOutcomes.approved),
      success: l10n.contentApprovedToast,
    );
  }

  Future<void> _decide(BuildContext context, WidgetRef ref, String outcome) async {
    final l10n = AppLocalizations.of(context);
    final withNote = ref.read(accessPolicyProvider).can(Permissions.feedbackCreate);
    final saved = await showReviewSheet(context, ref, content: content, outcome: outcome, withNote: withNote);
    if (saved && context.mounted) showToast(context, l10n.contentMovedToast(contentStatusLabel(l10n, outcome)));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final moves = contentMovesFrom(content.status);
    final inReview = content.status == ContentStatuses.inReview;
    final published = content.status == ContentStatuses.published;

    return SectionCard(
      title: l10n.contentWorkflowTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Pipeline(status: content.status),
          if (inReview) ...[
            SizedBox(height: tokens.md),
            _ApprovalStageBanner(contentId: content.id),
          ],
          SizedBox(height: tokens.lg),
          Text(l10n.contentWorkflowHint(content.status), style: text.bodyMedium?.copyWith(color: tokens.secondary)),
          if (!published) ...[
            SizedBox(height: tokens.lg),
            if (inReview)
              PermissionGate(
                anyOf: const [Permissions.approvalsApprove],
                fallback: Text(l10n.contentWaitingForReview, style: text.bodySmall?.copyWith(color: tokens.muted)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(l10n.contentReviewActions, style: text.labelLarge),
                    SizedBox(height: tokens.sm),
                    FilledButton.icon(
                      onPressed: () => _approve(context, ref),
                      icon: const Icon(Icons.check_circle_outline),
                      label: Text(l10n.contentActionApprove),
                    ),
                    SizedBox(height: tokens.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _decide(context, ref, ContentReviewOutcomes.changesRequested),
                            icon: const Icon(Icons.undo),
                            label: Text(l10n.contentActionRequestChanges),
                          ),
                        ),
                        SizedBox(width: tokens.sm),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                            onPressed: () => _decide(context, ref, ContentReviewOutcomes.draft),
                            icon: const Icon(Icons.thumb_down_outlined),
                            label: Text(l10n.contentActionReject),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            if (moves.isNotEmpty) ...[
              if (inReview) SizedBox(height: tokens.md),
              Wrap(
                spacing: tokens.sm,
                runSpacing: tokens.sm,
                children: [
                  for (final (i, move) in moves.indexed)
                    AllPermissionsGate(
                      allOf: _requirements(move),
                      child: _MoveButton(move: move, primary: i == 0 && !inReview, onPressed: () => _run(context, ref, move)),
                    ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _ApprovalStageBanner extends ConsumerWidget {
  const _ApprovalStageBanner({required this.contentId});

  final String contentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final summary = ref.watch(contentApprovalSummaryProvider(contentId)).value;
    if (summary == null) return const SizedBox.shrink();

    final members = ref.watch(membersProvider).value ?? const [];
    final names = _approverNames(summary.currentStep, members, l10n);
    final formats = context.formats;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius),
        border: Border.all(color: tokens.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(tokens.sm + 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.contentApprovalStage(summary.currentStep.order, summary.totalSteps, summary.currentStep.name),
              style: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
            SizedBox(height: tokens.xs),
            Text(l10n.contentApprovalWaiting(names), style: text.bodySmall?.copyWith(color: tokens.secondary)),
            if (summary.dueAt != null) ...[
              SizedBox(height: tokens.xs),
              Text(l10n.contentApprovalDue(formats.dateTime(summary.dueAt!)), style: text.bodySmall?.copyWith(color: tokens.muted)),
            ],
          ],
        ),
      ),
    );
  }

  String _approverNames(ContentApprovalStep step, List<Member> members, AppLocalizations l10n) {
    if (step.approverUserIds.isEmpty) return l10n.contentApprovalAnyApprover;
    final byId = {for (final member in members) member.userId: member.name};
    return step.approverUserIds.map((id) => byId[id] ?? id).join(', ');
  }
}

class _MoveButton extends StatelessWidget {
  const _MoveButton({required this.move, required this.primary, required this.onPressed});

  final ContentMove move;
  final bool primary;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final (label, icon) = switch (move.kind) {
      ContentMoveKind.submit => (l10n.contentActionSubmit, Icons.send_outlined),
      ContentMoveKind.withdraw => (l10n.contentActionWithdraw, Icons.undo),
      ContentMoveKind.schedule => (l10n.contentActionSchedule, Icons.event_available_outlined),
      ContentMoveKind.unschedule => (l10n.contentActionUnschedule, Icons.event_busy_outlined),
      ContentMoveKind.publish => (l10n.contentActionPublish, Icons.rocket_launch_outlined),
      ContentMoveKind.backToDraft => (l10n.contentActionBackToDraft, Icons.edit_note_outlined),
    };
    return primary
        ? FilledButton.icon(onPressed: onPressed, icon: Icon(icon), label: Text(label))
        : OutlinedButton.icon(onPressed: onPressed, icon: Icon(icon), label: Text(label));
  }
}

/// Five-step progress line: draft → review → approved → scheduled → published.
class _Pipeline extends StatelessWidget {
  const _Pipeline({required this.status});

  static const _dotSize = 12.0;
  static const _lineHeight = 2.0;

  final String status;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final text = Theme.of(context).textTheme;
    final current = pipelineIndex(status);
    final changes = status == ContentStatuses.changesRequested;
    final accent = contentStatusTone(status).color(tokens);
    return Semantics(
      label: l10n.contentPipelineSemantics(contentStatusLabel(l10n, status), current + 1, contentPipeline.length),
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final (i, step) in contentPipeline.indexed)
              Expanded(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: i == 0
                              ? const SizedBox.shrink()
                              : Container(height: _lineHeight, color: i <= current ? tokens.fg : tokens.border),
                        ),
                        AnimatedContainer(
                          duration: AppMotion.medium,
                          width: _dotSize,
                          height: _dotSize,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i < current ? tokens.fg : (i == current ? accent : tokens.surface),
                            border: Border.all(color: i <= current ? (i == current ? accent : tokens.fg) : tokens.border, width: 2),
                          ),
                        ),
                        Expanded(
                          child: i == contentPipeline.length - 1
                              ? const SizedBox.shrink()
                              : Container(height: _lineHeight, color: i < current ? tokens.fg : tokens.border),
                        ),
                      ],
                    ),
                    SizedBox(height: tokens.sm),
                    Text(
                      i == current && changes ? contentStatusLabel(l10n, status) : contentStatusLabel(l10n, step),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: text.labelSmall?.copyWith(
                        color: i == current ? tokens.fg : tokens.muted,
                        fontWeight: i == current ? FontWeight.w600 : null,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
