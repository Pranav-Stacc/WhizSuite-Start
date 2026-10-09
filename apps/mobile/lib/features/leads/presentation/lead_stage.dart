import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String leadStageLabel(AppLocalizations l10n, String stage) => l10n.leadStage(stage);

StatusTone leadStageTone(String stage) => switch (stage) {
      LeadStages.contacted => StatusTone.info,
      LeadStages.proposal => StatusTone.violet,
      LeadStages.negotiation => StatusTone.warning,
      LeadStages.won => StatusTone.success,
      LeadStages.lost => StatusTone.danger,
      _ => StatusTone.neutral,
    };

IconData leadStageIcon(String stage) => switch (stage) {
      LeadStages.contacted => Icons.forum_outlined,
      LeadStages.proposal => Icons.description_outlined,
      LeadStages.negotiation => Icons.handshake_outlined,
      LeadStages.won => Icons.emoji_events_outlined,
      LeadStages.lost => Icons.do_not_disturb_on_outlined,
      _ => Icons.fiber_new_outlined,
    };

class LeadStageBadge extends StatelessWidget {
  const LeadStageBadge({required this.stage, this.dense = false, super.key});

  final String stage;
  final bool dense;

  @override
  Widget build(BuildContext context) => StatusBadge(
        label: leadStageLabel(AppLocalizations.of(context), stage),
        tone: leadStageTone(stage),
        dense: dense,
      );
}
