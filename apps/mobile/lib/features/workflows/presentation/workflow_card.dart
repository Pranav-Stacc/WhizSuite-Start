import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/workflow.dart';
import 'workflow_widgets.dart';

class WorkflowCard extends StatelessWidget {
  const WorkflowCard({required this.workflow, required this.onTap, super.key});

  final Workflow workflow;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final sla = workflow.slaHours;
    final version = workflow.version;
    return SurfaceCard(
      onTap: onTap,
      semanticLabel: '${workflow.name}, ${workflow.active ? l10n.workflowActive : l10n.workflowInactive}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(workflow.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                    SizedBox(height: tokens.xs),
                    WorkflowBadges(workflow: workflow),
                  ],
                ),
              ),
              WorkflowActiveSwitch(workflow: workflow),
            ],
          ),
          SizedBox(height: tokens.md),
          WorkflowStageStepper(stages: workflow.stages, dense: true),
          SizedBox(height: tokens.md),
          Row(
            children: [
              Expanded(
                child: _Stat(
                  label: l10n.workflowEntityType,
                  value: l10n.workflowEntity(workflow.entityType),
                ),
              ),
              Expanded(
                child: _Stat(
                  label: l10n.workflowStagesTitle,
                  value: '${workflow.stages.length}',
                ),
              ),
              Expanded(
                child: _Stat(
                  label: l10n.workflowUpdated,
                  value: formats.relative(workflow.updatedAt),
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.sm),
          Row(
            children: [
              Icon(Icons.schedule, size: 16, color: tokens.muted),
              SizedBox(width: tokens.xs),
              Flexible(
                child: Text(
                  sla == null ? l10n.workflowNoSla : l10n.workflowSla(sla),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.labelMedium?.copyWith(color: tokens.muted),
                ),
              ),
              if (version != null) ...[
                SizedBox(width: tokens.md),
                TagChip(label: l10n.workflowVersionLabel(version)),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall?.copyWith(color: tokens.muted)),
        SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      ],
    );
  }
}
