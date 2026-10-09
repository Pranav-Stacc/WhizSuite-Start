import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/member.dart';
import 'team_labels.dart';

class MemberCard extends StatelessWidget {
  const MemberCard({required this.member, required this.onTap, this.isYou = false, super.key});

  static const _previewRoles = 3;

  final Member member;
  final VoidCallback onTap;
  final bool isYou;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final roles = member.roles.take(_previewRoles).toList();
    final typeLabel = membershipTypeLabel(l10n, member.membershipType);
    final statusLabel = memberStatusLabel(l10n, member.status);
    final joined = member.joinedAt;

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: [
        member.name,
        if (isYou) l10n.teamYou,
        typeLabel,
        statusLabel,
        ...member.roles.map((r) => r.name),
      ].join(', '),
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InitialsAvatar(name: member.name, seed: member.userId, size: 44),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              member.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: text.titleSmall,
                            ),
                          ),
                          if (isYou) ...[SizedBox(width: tokens.xs), TagChip(label: l10n.teamYou)],
                        ],
                      ),
                      Text(
                        [?member.title, member.email].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(color: tokens.muted),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: tokens.sm),
                StatusBadge(label: statusLabel, tone: memberStatusTone(member.status), dense: true),
              ],
            ),
            SizedBox(height: tokens.md),
            Wrap(
              spacing: tokens.xs,
              runSpacing: tokens.xs,
              children: [
                StatusBadge(label: typeLabel, tone: membershipTypeTone(member.membershipType), dense: true),
                for (final role in roles)
                  TagChip(label: role.name, icon: role.isSystem ? Icons.lock_outline : Icons.shield_outlined),
                if (member.roles.length > roles.length)
                  TagChip(label: l10n.rolePermissionsMore(member.roles.length - roles.length)),
              ],
            ),
            SizedBox(height: tokens.md),
            Row(
              children: [
                Expanded(
                  child: _Stat(
                    label: l10n.teamRoles,
                    value: member.roles.isEmpty ? l10n.valueUnknown : '${member.roles.length}',
                  ),
                ),
                Expanded(
                  child: _Stat(
                    label: l10n.teamJoined,
                    value: joined == null ? l10n.valueUnknown : formats.shortDate(joined),
                  ),
                ),
              ],
            ),
          ],
        ),
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
        Text(label, style: text.labelSmall?.copyWith(color: tokens.muted)),
        SizedBox(height: 2),
        Text(value, style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
      ],
    );
  }
}
