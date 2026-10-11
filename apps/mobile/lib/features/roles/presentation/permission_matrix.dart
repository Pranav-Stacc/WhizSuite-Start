import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/permission_catalog.dart';
import 'permission_labels.dart';

/// One permission domain: tri-state group toggle, count, and a switch per permission.
class PermissionGroupCard extends StatelessWidget {
  const PermissionGroupCard({
    required this.group,
    required this.selected,
    required this.expanded,
    required this.onExpandedChanged,
    required this.onToggle,
    required this.onToggleGroup,
    this.readOnly = false,
    this.scopeFooter,
    super.key,
  });

  final PermissionGroup group;
  final Set<String> selected;
  final bool expanded;
  final ValueChanged<bool> onExpandedChanged;
  final void Function(String key, bool granted) onToggle;
  final ValueChanged<bool> onToggleGroup;
  final bool readOnly;
  final Widget? scopeFooter;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final label = permissionGroupLabel(l10n, group.key);
    final selection = group.selectionIn(selected);
    final count = l10n.roleGroupCount(group.selectedCount(selected), group.permissions.length);

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Semantics(
            expanded: expanded,
            child: InkWell(
            onTap: () => onExpandedChanged(!expanded),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
              child: Row(
                children: [
                  Checkbox(
                    tristate: true,
                    value: switch (selection) {
                      GroupSelection.all => true,
                      GroupSelection.none => false,
                      GroupSelection.partial => null,
                    },
                    semanticLabel: l10n.roleGroupToggle(label),
                    onChanged: readOnly ? null : (_) => onToggleGroup(selection != GroupSelection.all),
                  ),
                  SizedBox(width: tokens.xs),
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(label, style: text.titleSmall),
                    ),
                  ),
                  _CountPill(label: count, active: selection != GroupSelection.none),
                  SizedBox(width: tokens.xs),
                  AnimatedRotation(
                    turns: expanded ? 0.5 : 0,
                    duration: AppMotion.fast,
                    child: Icon(Icons.expand_more, color: tokens.muted),
                  ),
                ],
              ),
            ),
            ),
          ),
          if (expanded)
            Column(
              children: [
                Divider(height: 1, color: tokens.border),
                for (final permission in group.permissions)
                  _PermissionTile(
                    permission: permission,
                    granted: selected.contains(permission.key),
                    onChanged: readOnly ? null : (value) => onToggle(permission.key, value),
                  ),
                if (scopeFooter != null) scopeFooter!,
              ],
            ),
        ],
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  const _PermissionTile({required this.permission, required this.granted, required this.onChanged});

  final PermissionDef permission;
  final bool granted;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    return SwitchListTile.adaptive(
      value: granted,
      onChanged: onChanged,
      dense: true,
      contentPadding: EdgeInsets.symmetric(horizontal: tokens.lg),
      title: Text(permissionActionLabel(l10n, permission.action), style: text.bodyMedium),
      subtitle: Text(
        permission.key,
        style: text.labelSmall?.copyWith(color: tokens.muted, fontFamily: 'monospace', letterSpacing: 0),
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return AnimatedContainer(
      duration: AppMotion.fast,
      padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 2),
      decoration: BoxDecoration(
        color: active ? tokens.primary.withValues(alpha: 0.1) : tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 999),
        border: Border.all(color: active ? tokens.primary.withValues(alpha: 0.3) : tokens.border),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: active ? tokens.fg : tokens.muted,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
      ),
    );
  }
}
