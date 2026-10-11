import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../team/domain/scope_assignment.dart';
import '../../team/presentation/scope_picker.dart';
import '../domain/permission_module_scopes.dart';

/// Editable per-module data scope chips and resource pickers (role create/edit).
class ModuleScopeEditor extends ConsumerWidget {
  const ModuleScopeEditor({
    required this.groupLabel,
    required this.moduleKey,
    required this.allowedScopes,
    required this.scopes,
    required this.resourceIdsByScope,
    required this.targetingByScope,
    required this.onScopesChanged,
    required this.onResourceIdsChanged,
    required this.onTargetingChanged,
    super.key,
  });

  final String groupLabel;
  final String moduleKey;
  final List<String> allowedScopes;
  final Set<String> scopes;
  final Map<String, Set<String>> resourceIdsByScope;
  final Map<String, ScopeResourceTargeting> targetingByScope;
  final ValueChanged<Set<String>> onScopesChanged;
  final void Function(String scopeType, Set<String> ids) onResourceIdsChanged;
  final void Function(String scopeType, ScopeResourceTargeting mode) onTargetingChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.md, tokens.md),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: tokens.subtle,
          borderRadius: tokens.borderRadius,
          border: Border.all(color: tokens.border),
        ),
        child: Padding(
          padding: EdgeInsets.all(tokens.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.layers_outlined, size: 18, color: tokens.secondary),
                  SizedBox(width: tokens.sm),
                  Expanded(
                    child: Text(l10n.roleModuleScopeTitle(groupLabel), style: text.titleSmall),
                  ),
                ],
              ),
              SizedBox(height: tokens.xs),
              Text(l10n.roleModuleScopeHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
              SizedBox(height: tokens.sm),
              Wrap(
                spacing: tokens.xs,
                runSpacing: tokens.xs,
                children: [
                  for (final scope in allowedScopes)
                    FilterChip(
                      label: Text(scopeTypeLabel(scope)),
                      selected: scopes.contains(scope),
                      onSelected: (on) {
                        final next = Set<String>.from(scopes);
                        if (on) {
                          next.add(scope);
                          if (scopeNeedsResource(scope)) {
                            onTargetingChanged(scope, ScopeResourceTargeting.specific);
                          }
                        } else if (next.length > 1) {
                          next.remove(scope);
                        }
                        onScopesChanged(next);
                      },
                    ),
                ],
              ),
              for (final scope in scopes.where(scopeNeedsResource)) ...[
                SizedBox(height: tokens.md),
                ResourceMultiPicker(
                  scopeType: scope,
                  targeting: targetingByScope[scope] ?? ScopeResourceTargeting.specific,
                  selectedIds: resourceIdsByScope[scope] ?? const {},
                  onTargetingChanged: (mode) => onTargetingChanged(scope, mode),
                  onChanged: (ids) => onResourceIdsChanged(scope, ids),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Read-only scope summary on the role detail screen.
class ModuleScopeSummary extends StatelessWidget {
  const ModuleScopeSummary({
    required this.groupLabel,
    required this.scopes,
    super.key,
  });

  final String groupLabel;
  final Set<String> scopes;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    if (scopes.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: EdgeInsets.only(top: tokens.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.roleModuleScopeTitle(groupLabel), style: text.labelMedium?.copyWith(color: tokens.secondary)),
          SizedBox(height: tokens.xs),
          Wrap(
            spacing: tokens.xs,
            runSpacing: tokens.xs,
            children: [
              for (final scope in scopes)
                TagChip(label: scopeTypeLabel(scope)),
            ],
          ),
        ],
      ),
    );
  }
}
