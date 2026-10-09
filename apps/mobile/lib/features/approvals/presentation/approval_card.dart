import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../domain/approval.dart';
import 'approval_labels.dart';

class ApprovalCard extends ConsumerWidget {
  const ApprovalCard({required this.approval, required this.onTap, this.subjectTitle, super.key});

  static const _avatarSize = 36.0;

  final ApprovalRequest approval;
  final VoidCallback onTap;
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
    final statusLabel = approvalStatusLabel(l10n, approval.status);
    final dueAt = approval.effectiveDueAt;
    final due = dueAt == null ? null : formats.due(dueAt);
    final step = approval.currentStep;
    final doneSteps = approval.steps.where((s) => !s.isPending).length;
    final totalSteps = approval.steps.length;
    final progress = totalSteps == 0 ? 0.0 : doneSteps / totalSteps;
    final requesterLine =
        requester == null ? l10n.approvalRequesterUnknown : l10n.approvalRequester(requester);

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: [title, statusLabel, requesterLine, ?step?.name, ?due?.label].join(', '),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InitialsAvatar(
                name: requester ?? title,
                seed: approval.requestedById,
                size: _avatarSize,
              ),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                    SizedBox(height: tokens.xs),
                    Text(
                      approvalSubjectTypeLabel(l10n, approval.subjectType),
                      style: text.labelMedium?.copyWith(color: tokens.muted),
                    ),
                  ],
                ),
              ),
              SizedBox(width: tokens.sm),
              StatusBadge(label: statusLabel, tone: approvalStatusTone(approval.status), dense: true),
            ],
          ),
          SizedBox(height: tokens.md),
          Row(
            children: [
              Icon(Icons.person_outline, size: 16, color: tokens.muted),
              SizedBox(width: tokens.xs),
              Expanded(
                child: Text(requesterLine, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.bodySmall),
              ),
            ],
          ),
          if (step != null) ...[
            SizedBox(height: tokens.sm),
            Row(
              children: [
                Icon(Icons.flag_outlined, size: 16, color: tokens.muted),
                SizedBox(width: tokens.xs),
                Expanded(
                  child: Text(
                    '${l10n.approvalCurrentStep}: ${step.name}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall,
                  ),
                ),
              ],
            ),
          ],
          if (totalSteps > 0) ...[
            SizedBox(height: tokens.md),
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.approvalStepsProgress(doneSteps, totalSteps),
                    style: text.labelSmall?.copyWith(color: tokens.muted),
                  ),
                ),
                Text(
                  formats.percent(progress),
                  style: text.labelSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                ),
              ],
            ),
            SizedBox(height: tokens.xs),
            ProgressMeter(
              value: progress,
              tone: approval.isPending ? StatusTone.warning : StatusTone.success,
              label: l10n.approvalStepsTitle,
            ),
          ],
          SizedBox(height: tokens.md),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              if (due != null)
                StatusBadge(label: due.label, tone: due.tone, dense: true)
              else
                StatusBadge(label: l10n.approvalNoDue, tone: StatusTone.neutral, dense: true),
              StatusBadge(
                label: l10n.approvalRequestedAgo(formats.relative(approval.createdAt)),
                tone: StatusTone.neutral,
                dense: true,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
