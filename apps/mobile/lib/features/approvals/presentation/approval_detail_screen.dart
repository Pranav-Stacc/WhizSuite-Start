import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/approvals_controller.dart';
import '../domain/approval.dart';
import 'approval_actions.dart';
import 'approval_labels.dart';

class ApprovalDetailScreen extends ConsumerWidget {
  const ApprovalDetailScreen({required this.approvalId, super.key});

  final String approvalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final approval = ref.watch(approvalProvider(approvalId));
    final titles = ref.watch(approvalSubjectTitlesProvider);
    final loaded = approval.value;
    final title = loaded == null
        ? l10n.approvalsTitle
        : approvalTitle(l10n, loaded, subjectTitle: titles[loaded.subjectId]);

    return PageScaffold(
      title: title,
      body: AsyncValueView<ApprovalRequest>(
        value: approval,
        onRetry: () => ref.invalidate(approvalProvider(approvalId)),
        data: (item) => _Body(
          approval: item,
          subjectTitle: titles[item.subjectId],
          onRefresh: () => ref.refresh(approvalProvider(approvalId).future),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.approval, required this.onRefresh, this.subjectTitle});

  final ApprovalRequest approval;
  final String? subjectTitle;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final gap = SizedBox(height: tokens.lg);

    return ReadableBody(
      onRefresh: onRefresh,
      children: [
        FadeSlideIn(child: _Header(approval: approval, subjectTitle: subjectTitle)),
        gap,
        FadeSlideIn(index: 1, child: _Metrics(approval: approval)),
        gap,
        FadeSlideIn(index: 2, child: _StepsCard(approval: approval)),
        gap,
        FadeSlideIn(index: 3, child: _DecideCard(approval: approval)),
        gap,
        FadeSlideIn(index: 4, child: _TimelineCard(approval: approval)),
      ],
    );
  }
}

class _Metrics extends StatelessWidget {
  const _Metrics({required this.approval});

  static const _minTileWidth = 160.0;

  final ApprovalRequest approval;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final dueAt = approval.effectiveDueAt;
    final due = dueAt == null ? null : formats.due(dueAt);
    final done = approval.steps.where((s) => !s.isPending).length;
    final total = approval.steps.length;
    final progress = total == 0 ? 0.0 : done / total;
    final tiles = [
      MetricTile(
        label: l10n.approvalDueLabel,
        icon: Icons.event_outlined,
        value: dueAt == null ? l10n.approvalNoDue : formats.date(dueAt),
        caption: due?.label,
        tone: due?.tone ?? StatusTone.neutral,
      ),
      MetricTile(
        label: l10n.approvalStepsTitle,
        icon: Icons.flag_outlined,
        value: total == 0 ? l10n.valueNone : l10n.approvalStepsProgress(done, total),
        caption: total == 0 ? null : formats.percent(progress),
        tone: approval.isPending ? StatusTone.warning : StatusTone.success,
      ),
      MetricTile(
        label: approvalStatusLabel(l10n, approval.status),
        icon: Icons.verified_outlined,
        value: approvalStatusLabel(l10n, approval.status),
        caption: l10n.approvalRequestedAgo(formats.relative(approval.createdAt)),
        tone: approvalStatusTone(approval.status),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = gridColumns(constraints.maxWidth, minTileWidth: _minTileWidth, max: 3);
        final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
        return Wrap(
          spacing: tokens.md,
          runSpacing: tokens.md,
          children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
        );
      },
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.approval, this.subjectTitle});

  final ApprovalRequest approval;
  final String? subjectTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final requester = members.nameOf(approval.requestedById);
    final title = approvalTitle(l10n, approval, subjectTitle: subjectTitle);
    final dueAt = approval.effectiveDueAt;
    final due = dueAt == null ? null : formats.due(dueAt);
    final subjectRoute = approvalSubjectRoute(approval);

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(title, style: text.headlineSmall)),
          SizedBox(height: tokens.sm),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              StatusBadge(label: approvalStatusLabel(l10n, approval.status), tone: approvalStatusTone(approval.status)),
              TagChip(label: approvalSubjectTypeLabel(l10n, approval.subjectType), icon: Icons.category_outlined),
              if (due != null) StatusBadge(label: due.label, tone: due.tone, dense: true),
            ],
          ),
          SizedBox(height: tokens.md),
          Text(
            requester == null ? l10n.approvalRequesterUnknown : l10n.approvalRequester(requester),
            style: text.bodyMedium,
          ),
          SizedBox(height: tokens.xs),
          Text(
            l10n.approvalRequestedAgo(formats.relative(approval.createdAt)),
            style: text.bodySmall?.copyWith(color: tokens.muted),
          ),
          if (subjectRoute != null) ...[
            SizedBox(height: tokens.lg),
            OutlinedButton.icon(
              onPressed: () => context.push(subjectRoute),
              icon: const Icon(Icons.open_in_new),
              label: Text(l10n.approvalOpenSubject),
            ),
          ],
        ],
      ),
    );
  }
}

class _StepsCard extends ConsumerWidget {
  const _StepsCard({required this.approval});

  final ApprovalRequest approval;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;

    return SectionCard(
      title: l10n.approvalStepsTitle,
      child: Column(
        children: [
          for (final (i, step) in approval.steps.indexed) ...[
            if (i > 0) SizedBox(height: tokens.md),
            _StepRow(step: step, members: members, isCurrent: approval.currentStep?.id == step.id),
          ],
          if (approval.steps.isEmpty)
            Text(l10n.approvalTimelineEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.step, required this.members, required this.isCurrent});

  final ApprovalStep step;
  final Directory members;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final dueAt = step.dueAt;
    final names = [
      for (final id in step.approverIds) members.nameOf(id) ?? id,
    ];

    return Container(
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(
        color: isCurrent ? tokens.subtle : null,
        borderRadius: tokens.borderRadius,
        border: Border.all(color: isCurrent ? tokens.fg.withValues(alpha: 0.2) : tokens.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            step.isApproved
                ? Icons.check_circle
                : (step.isPending ? Icons.radio_button_unchecked : Icons.cancel_outlined),
            color: approvalStatusTone(step.status).color(tokens),
            size: 22,
          ),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(step.name, style: text.titleSmall)),
                    StatusBadge(
                      label: approvalStatusLabel(l10n, step.status),
                      tone: approvalStatusTone(step.status),
                      dense: true,
                    ),
                  ],
                ),
                SizedBox(height: tokens.xs),
                Text(approvalRuleLabel(l10n, step.rule), style: text.bodySmall?.copyWith(color: tokens.muted)),
                if (names.isNotEmpty) ...[
                  SizedBox(height: tokens.xs),
                  Text(names.join(', '), style: text.bodySmall),
                ],
                if (dueAt != null) ...[
                  SizedBox(height: tokens.xs),
                  Text(l10n.approvalDue(formats.date(dueAt)), style: text.labelSmall?.copyWith(color: tokens.muted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DecideCard extends ConsumerWidget {
  const _DecideCard({required this.approval});

  final ApprovalRequest approval;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final userId = ref.watch(sessionProvider).value?.userId;
    final canApprove = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.approvalsApprove)));

    if (!approval.isPending) {
      return SectionCard(
        title: l10n.approvalDecideTitle,
        child: Text(
          l10n.approvalAlreadyDecided(approvalStatusLabel(l10n, approval.status)),
          style: text.bodyMedium?.copyWith(color: tokens.muted),
        ),
      );
    }

    return SectionCard(
      title: l10n.approvalDecideTitle,
      child: PermissionGate(
        anyOf: const [Permissions.approvalsApprove],
        fallback: Text(l10n.approvalWaitingDecision, style: text.bodyMedium?.copyWith(color: tokens.muted)),
        child: Builder(
          builder: (context) {
            final mayAct = userId != null && approval.canAct(userId);
            if (!mayAct && canApprove) {
              return Text(l10n.approvalNotApprover, style: text.bodyMedium?.copyWith(color: tokens.muted));
            }
            return Wrap(
              spacing: tokens.sm,
              runSpacing: tokens.sm,
              children: [
                FilledButton.icon(
                  onPressed: mayAct
                      ? () => decideApproval(context, ref, approval, action: ApprovalActions.approved)
                      : null,
                  icon: const Icon(Icons.check_circle_outline),
                  label: Text(l10n.approvalActionApprove),
                ),
                OutlinedButton.icon(
                  onPressed: mayAct
                      ? () => decideApproval(context, ref, approval, action: ApprovalActions.changesRequested)
                      : null,
                  icon: const Icon(Icons.undo),
                  label: Text(l10n.approvalActionRequestChanges),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                  onPressed: mayAct
                      ? () => decideApproval(context, ref, approval, action: ApprovalActions.rejected)
                      : null,
                  icon: const Icon(Icons.thumb_down_outlined),
                  label: Text(l10n.approvalActionReject),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TimelineCard extends ConsumerWidget {
  const _TimelineCard({required this.approval});

  final ApprovalRequest approval;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final stepsById = {for (final s in approval.steps) s.id: s};

    return SectionCard(
      title: l10n.approvalTimelineTitle,
      child: approval.actions.isEmpty
          ? Text(l10n.approvalTimelineEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
          : Column(
              children: [
                for (final (i, action) in approval.actions.indexed) ...[
                  if (i > 0) Divider(height: tokens.lg * 2, color: tokens.border),
                  _ActionRow(
                    action: action,
                    actorName: members.nameOf(action.actorId) ?? l10n.valueUnknown,
                    stepName: action.stepId == null ? null : stepsById[action.stepId!]?.name,
                    when: formats.dateTime(action.createdAt),
                  ),
                ],
              ],
            ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({required this.action, required this.actorName, required this.when, this.stepName});

  final ApprovalActionRecord action;
  final String actorName;
  final String? stepName;
  final String when;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final label = approvalActionLabel(l10n, action.action);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.history, size: 20, color: approvalActionTone(action.action).color(tokens)),
        SizedBox(width: tokens.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.approvalActionBy(label, actorName), style: text.titleSmall),
              if (stepName != null) ...[
                SizedBox(height: 2),
                Text(stepName!, style: text.bodySmall?.copyWith(color: tokens.muted)),
              ],
              if (action.comment != null && action.comment!.isNotEmpty) ...[
                SizedBox(height: tokens.sm),
                Text(action.comment!, style: text.bodyMedium),
              ],
              SizedBox(height: tokens.xs),
              Text(when, style: text.labelSmall?.copyWith(color: tokens.muted)),
            ],
          ),
        ),
        StatusBadge(label: label, tone: approvalActionTone(action.action), dense: true),
      ],
    );
  }
}
