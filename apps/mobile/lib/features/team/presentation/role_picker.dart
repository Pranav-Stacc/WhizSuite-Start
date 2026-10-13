import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../l10n/app_localizations.dart';
import '../../roles/application/roles_controller.dart';
import '../../roles/domain/role.dart';

/// Multi-select of the organisation's assignable roles, capped at [memberRolesMax].
class RolePickerField extends ConsumerWidget {
  const RolePickerField({
    required this.selected,
    required this.onChanged,
    this.required = true,
    this.compact = false,
    super.key,
  });

  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  /// Assignment replaces every role, so a member always keeps at least one.
  final bool required;

  /// Shorter chip list for invite dialogs.
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final roles = ref.watch(assignableRolesProvider);
    final items = roles.value;

    if (items == null) {
      if (roles case AsyncError(:final error)) {
        return ErrorState(error: error, onRetry: () => ref.invalidate(rolesProvider));
      }
      return const SizedBox(height: 120, child: SkeletonList(itemCount: 2, leading: false));
    }

    final full = selected.length >= memberRolesMax;
    return FormField<Set<String>>(
      validator: (_) {
        if (required && selected.isEmpty) return l10n.teamRolesRequired;
        if (selected.length > memberRolesMax) return l10n.teamRolesMax(memberRolesMax);
        return null;
      },
      builder: (state) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(l10n.teamRoles, style: text.titleSmall)),
              Text(
                l10n.teamRolesCount(selected.length, memberRolesMax),
                style: text.labelSmall?.copyWith(color: tokens.muted),
              ),
            ],
          ),
          SizedBox(height: tokens.sm),
          SizedBox(
            height: compact ? 132 : null,
            child: SingleChildScrollView(
              child: Wrap(
                spacing: tokens.sm,
                runSpacing: tokens.sm,
                children: [
                  for (final role in items)
                    FilterChip(
                      avatar: Icon(role.isSystem ? Icons.lock_outline : Icons.shield_outlined, size: 16),
                      label: Text(role.name),
                      tooltip: role.description.isEmpty ? null : role.description,
                      selected: selected.contains(role.id),
                      onSelected: !selected.contains(role.id) && full
                          ? null
                          : (on) {
                              onChanged(on ? {...selected, role.id} : ({...selected}..remove(role.id)));
                              state.didChange(selected);
                            },
                    ),
                ],
              ),
            ),
          ),
          if (state.hasError) ...[
            SizedBox(height: tokens.sm),
            Text(state.errorText ?? '', style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
          ],
          SizedBox(height: tokens.sm),
          Text(_hint(l10n, items), style: text.bodySmall?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }

  String _hint(AppLocalizations l10n, List<Role> roles) =>
      roles.any((r) => !r.isSystem) ? l10n.teamRolesHint : l10n.teamRolesHintNoCustom;
}
