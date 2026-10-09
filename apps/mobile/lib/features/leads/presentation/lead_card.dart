import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../domain/lead.dart';
import 'lead_stage.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Board card: company, contact, value, source, next step and owner.
class LeadCard extends StatelessWidget {
  const LeadCard({
    required this.lead,
    required this.onTap,
    this.ownerName,
    this.onMove,
    this.showStage = false,
    super.key,
  });

  static const _ownerAvatarSize = 24.0;

  final Lead lead;
  final VoidCallback onTap;
  final String? ownerName;

  /// Enables the "Move to stage" menu, the non-drag way to change a stage.
  final ValueChanged<String>? onMove;
  final bool showStage;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final value = formats.money(lead.valueMinor, currency: lead.currency, compact: true);
    final subtitle = lead.subtitle;
    final owner = ownerName;
    final move = onMove;
    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.xs, tokens.md),
      semanticLabel: l10n.leadCardLabel(lead.companyName, leadStageLabel(l10n, lead.stage), value),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(lead.companyName, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                    if (subtitle != null)
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(color: tokens.muted),
                      ),
                  ],
                ),
              ),
              if (showStage) ...[SizedBox(width: tokens.sm), LeadStageBadge(stage: lead.stage, dense: true)],
              if (move != null) LeadMoveMenu(stage: lead.stage, onSelected: move) else SizedBox(width: tokens.sm),
            ],
          ),
          SizedBox(height: tokens.sm),
          Padding(
            padding: EdgeInsetsDirectional.only(end: tokens.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        value,
                        style: text.titleMedium?.copyWith(fontWeight: FontWeight.w600, fontFeatures: _tabular),
                      ),
                    ),
                    if (lead.source != null) Flexible(child: TagChip(label: lead.source ?? '')),
                  ],
                ),
                if (lead.isConverted || lead.nextStep != null) ...[
                  SizedBox(height: tokens.sm),
                  lead.isConverted ? const _ConvertedLine() : _NextStepLine(lead: lead),
                ],
                if (owner != null) ...[
                  SizedBox(height: tokens.sm),
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: Tooltip(
                      message: owner,
                      child: InitialsAvatar(name: owner, seed: lead.ownerId, size: _ownerAvatarSize),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ConvertedLine extends StatelessWidget {
  const _ConvertedLine();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = StatusTone.success.color(tokens);
    return Row(
      children: [
        Icon(Icons.check_circle_outline, size: 16, color: color),
        SizedBox(width: tokens.xs),
        Flexible(
          child: Text(
            AppLocalizations.of(context).leadConverted,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
          ),
        ),
      ],
    );
  }
}

class _NextStepLine extends StatelessWidget {
  const _NextStepLine({required this.lead});

  final Lead lead;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final due = lead.nextStepAt;
    return Row(
      children: [
        Icon(Icons.event_outlined, size: 16, color: tokens.muted),
        SizedBox(width: tokens.xs),
        Expanded(
          child: Text(
            lead.nextStep ?? '',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.secondary),
          ),
        ),
        if (due != null && lead.isOpen) ...[SizedBox(width: tokens.xs), LeadDueBadge(date: due)],
      ],
    );
  }
}

/// Due wording for a next step, toned by urgency.
class LeadDueBadge extends StatelessWidget {
  const LeadDueBadge({required this.date, super.key});

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final due = context.formats.due(date);
    return StatusBadge(label: due.label, tone: due.tone, dense: true);
  }
}

/// Overflow menu listing every other stage; gated by the permission the stage PATCH requires.
class LeadMoveMenu extends StatelessWidget {
  const LeadMoveMenu({required this.stage, required this.onSelected, super.key});

  final String stage;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PermissionGate(
      anyOf: const [Permissions.leadsCreate],
      child: PopupMenuButton<String>(
        tooltip: l10n.leadMoveTo,
        icon: const Icon(Icons.more_vert),
        onSelected: onSelected,
        itemBuilder: (_) => [
          for (final option in LeadStages.values)
            if (option != stage)
              PopupMenuItem(
                value: option,
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(leadStageIcon(option), color: leadStageTone(option).color(context.tokens)),
                  title: Text(leadStageLabel(l10n, option)),
                ),
              ),
        ],
      ),
    );
  }
}
