import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../roles/domain/role.dart';
import '../../team/domain/member.dart';
import '../application/workflows_controller.dart';
import '../domain/workflow.dart';

String workflowApprovalRuleLabel(AppLocalizations l10n, String rule) => switch (rule) {
      ApprovalStepRules.all => l10n.workflowStageRuleAll,
      ApprovalStepRules.quorum => l10n.workflowStageRuleQuorum,
      _ => l10n.workflowStageRuleAny,
    };

/// Horizontal stepper: numbered stage chips joined by connector lines. Scrolls when it overflows.
class WorkflowStageStepper extends StatelessWidget {
  const WorkflowStageStepper({required this.stages, this.dense = false, super.key});

  static const _connectorWidth = 20.0;
  static const _connectorHeight = 2.0;

  final List<WorkflowStage> stages;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final names = stages.map((stage) => stage.name).join(', ');
    return Semantics(
      label: l10n.workflowStagesSemantics(stages.length, names),
      child: ExcludeSemantics(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final (i, stage) in stages.indexed) ...[
                if (i > 0)
                  Container(
                    width: dense ? _connectorWidth / 2 : _connectorWidth,
                    height: _connectorHeight,
                    color: tokens.border,
                  ),
                _StageChip(
                  index: i,
                  label: stage.name,
                  dense: dense,
                  terminal: i == stages.length - 1,
                  hasAssignees: stage.hasAssignees,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StageChip extends StatelessWidget {
  const _StageChip({
    required this.index,
    required this.label,
    required this.dense,
    required this.terminal,
    required this.hasAssignees,
  });

  static const _fillAlpha = 0.14;
  static const _maxLabelWidth = 180.0;

  final int index;
  final String label;
  final bool dense;
  final bool terminal;
  final bool hasAssignees;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final dot = dense ? 16.0 : 20.0;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: dense ? 2 : tokens.xs + 2),
      decoration: BoxDecoration(
        color: terminal ? tokens.primary.withValues(alpha: _fillAlpha / 2) : tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        border: Border.all(color: terminal ? tokens.primary.withValues(alpha: _fillAlpha * 2) : tokens.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: dot,
            height: dot,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: tokens.primary.withValues(alpha: _fillAlpha), shape: BoxShape.circle),
            child: terminal
                ? Icon(Icons.check, size: dot * 0.65, color: tokens.primary)
                : Text(
                    '${index + 1}',
                    style: text.labelSmall?.copyWith(color: tokens.primary, fontWeight: FontWeight.w600),
                  ),
          ),
          SizedBox(width: tokens.xs + 2),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: _maxLabelWidth),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: (dense ? text.labelMedium : text.bodyMedium)?.copyWith(color: tokens.fg),
            ),
          ),
          if (hasAssignees) ...[
            SizedBox(width: tokens.xs),
            Icon(Icons.how_to_reg_outlined, size: dense ? 14 : 16, color: tokens.muted),
          ],
        ],
      ),
    );
  }
}

/// Per-stage approval rules and assignees for the detail screen.
class WorkflowStageDetailsList extends StatelessWidget {
  const WorkflowStageDetailsList({
    required this.stages,
    required this.roles,
    required this.members,
    super.key,
  });

  final List<WorkflowStage> stages;
  final List<Role> roles;
  final List<Member> members;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final rolesById = {for (final role in roles) role.id: role};
    final membersById = {for (final member in members) member.userId: member};

    return Column(
      children: [
        for (final (i, stage) in stages.indexed)
          Padding(
            padding: EdgeInsets.only(bottom: i == stages.length - 1 ? 0 : tokens.md),
            child: SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: tokens.primary.withValues(alpha: 0.14),
                        child: Text(
                          '${i + 1}',
                          style: text.labelSmall?.copyWith(color: tokens.primary, fontWeight: FontWeight.w600),
                        ),
                      ),
                      SizedBox(width: tokens.sm),
                      Expanded(child: Text(stage.name, style: text.titleSmall)),
                    ],
                  ),
                  SizedBox(height: tokens.sm),
                  InfoRow(
                    label: l10n.workflowStageApprovalRule,
                    value: Text(workflowApprovalRuleLabel(l10n, stage.approvalRule)),
                  ),
                  if (stage.approvalRule == ApprovalStepRules.quorum && stage.quorumCount != null)
                    InfoRow(
                      label: l10n.workflowStageQuorum,
                      value: Text('${stage.quorumCount}'),
                    ),
                  if (stage.roleIds.isNotEmpty)
                    InfoRow(
                      label: l10n.workflowStageRoles,
                      value: Text(
                        stage.roleIds
                            .map((id) => rolesById[id]?.name ?? l10n.valueUnknown)
                            .join(', '),
                      ),
                    ),
                  if (stage.approverIds.isNotEmpty)
                    InfoRow(
                      label: l10n.workflowStagePeople,
                      value: Text(
                        stage.approverIds
                            .map((id) => membersById[id]?.name ?? l10n.valueUnknown)
                            .join(', '),
                      ),
                    ),
                  if (!stage.hasAssignees)
                    Text(
                      l10n.workflowStageNoAssignees,
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Active / client-approval badges shared by cards and the detail header.
class WorkflowBadges extends StatelessWidget {
  const WorkflowBadges({required this.workflow, super.key});

  final Workflow workflow;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Wrap(
      spacing: tokens.xs + 2,
      runSpacing: tokens.xs,
      children: [
        StatusBadge(
          label: workflow.active ? l10n.workflowActive : l10n.workflowInactive,
          tone: workflow.active ? StatusTone.success : StatusTone.neutral,
          dense: true,
        ),
        StatusBadge(
          label: workflow.requiresClientApproval ? l10n.workflowClientApproval : l10n.workflowInternalOnly,
          tone: workflow.requiresClientApproval ? StatusTone.violet : StatusTone.neutral,
          dense: true,
        ),
      ],
    );
  }
}

/// Active switch that shows the requested state while the API call is in flight.
class WorkflowActiveSwitch extends ConsumerStatefulWidget {
  const WorkflowActiveSwitch({required this.workflow, super.key});

  final Workflow workflow;

  @override
  ConsumerState<WorkflowActiveSwitch> createState() => _WorkflowActiveSwitchState();
}

class _WorkflowActiveSwitchState extends ConsumerState<WorkflowActiveSwitch> {
  bool? _pending;

  Future<void> _toggle(bool active) async {
    final l10n = AppLocalizations.of(context);
    setState(() => _pending = active);
    await runAction(
      context,
      () => ref.read(workflowsActionsProvider).setActive(widget.workflow.id, active: active),
      success: active ? l10n.workflowActivatedToast : l10n.workflowDeactivatedToast,
    );
    if (mounted) setState(() => _pending = null);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PermissionGate(
      anyOf: const [Permissions.workflowsManage],
      child: Semantics(
        label: l10n.workflowToggle(widget.workflow.name),
        child: Switch(value: _pending ?? widget.workflow.active, onChanged: _pending == null ? _toggle : null),
      ),
    );
  }
}
