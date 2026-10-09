import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/permission_catalog.dart';
import '../domain/role.dart';
import 'permission_labels.dart';

/// Origin filter for the roles list (system vs custom). Distinct from contract [RoleKinds] (ACCESS / WORKFLOW).
abstract final class RoleOrigins {
  static const system = 'system';
  static const custom = 'custom';

  static const values = [system, custom];

  static String of(Role role) => role.isSystem ? system : custom;
}

StatusTone roleKindTone(Role role) => role.isSystem ? StatusTone.neutral : StatusTone.info;

class RoleCard extends StatelessWidget {
  const RoleCard({required this.role, required this.onTap, super.key});

  static const _previewGroups = 3;

  final Role role;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final groups = {for (final key in role.permissionKeys) PermissionDef.groupOf(key)}.toList()..sort();
    final preview = groups.take(_previewGroups).toList();
    final kind = l10n.roleKind(RoleOrigins.of(role));

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: '${role.name}, $kind, ${l10n.roleMembers(role.memberCount)}, '
          '${l10n.rolePermissionCount(role.permissionKeys.length)}',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: EdgeInsets.all(tokens.sm),
                  decoration: BoxDecoration(
                    color: tokens.subtle,
                    borderRadius: BorderRadius.circular(tokens.radius + 6),
                    border: Border.all(color: tokens.border),
                  ),
                  child: Icon(
                    role.isSystem ? Icons.lock_outline : Icons.shield_outlined,
                    size: 20,
                    color: tokens.secondary,
                  ),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Text(role.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                ),
                SizedBox(width: tokens.sm),
                StatusBadge(label: kind, tone: roleKindTone(role), dense: true),
              ],
            ),
            SizedBox(height: tokens.md),
            Text(
              role.description.isEmpty ? l10n.roleNoDescription : role.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: text.bodySmall?.copyWith(color: tokens.muted),
            ),
            SizedBox(height: tokens.md),
            Wrap(
              spacing: tokens.xs,
              runSpacing: tokens.xs,
              children: [
                for (final group in preview) TagChip(label: permissionGroupLabel(l10n, group)),
                if (groups.length > preview.length) TagChip(label: l10n.rolePermissionsMore(groups.length - preview.length)),
              ],
            ),
            SizedBox(height: tokens.md),
            Row(
              children: [
                _Stat(icon: Icons.people_outline, label: l10n.roleMembers(role.memberCount)),
                SizedBox(width: tokens.lg),
                _Stat(icon: Icons.key_outlined, label: l10n.rolePermissionCount(role.permissionKeys.length)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: tokens.muted),
        SizedBox(width: tokens.xs),
        Text(label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.secondary)),
      ],
    );
  }
}
