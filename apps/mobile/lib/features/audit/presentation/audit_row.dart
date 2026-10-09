import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/audit_entry.dart';
import 'audit_labels.dart';

class AuditRow extends StatelessWidget {
  const AuditRow({required this.entry, required this.actorName, required this.onTap, super.key});

  final AuditEntry entry;
  final String actorName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final verb = auditActionLabel(l10n, entry);
    final entity = entry.entityLabel ?? auditEntityTypeLabel(l10n, entry.entityType);
    final outcome = auditOutcomeLabel(l10n, entry.outcome);
    final when = formats.relative(entry.createdAt);
    final isUser = entry.actorType == AuditActorTypes.user;

    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
      semanticLabel: '$actorName, $verb, $entity, $outcome, $when',
      child: ExcludeSemantics(
        child: Row(
          children: [
            isUser
                ? InitialsAvatar(name: actorName, seed: entry.actorId, size: 36)
                : Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(color: tokens.subtle, shape: BoxShape.circle, border: Border.all(color: tokens.border)),
                    child: Icon(Icons.memory, size: 18, color: tokens.secondary),
                  ),
            SizedBox(width: tokens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(actorName, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  SizedBox(height: 2),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: verb, style: TextStyle(color: tokens.fg, fontWeight: FontWeight.w500)),
                        TextSpan(text: ' · $entity', style: TextStyle(color: tokens.muted)),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall,
                  ),
                ],
              ),
            ),
            SizedBox(width: tokens.sm),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                StatusBadge(label: outcome, tone: auditOutcomeTone(entry.outcome), dense: true),
                SizedBox(height: tokens.xs),
                Text(
                  when,
                  style: text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: const [FontFeature.tabularFigures()]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
