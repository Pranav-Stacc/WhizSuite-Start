import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../departments/application/departments_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../roles/domain/permission_module_scopes.dart';
import '../../roles/domain/role.dart';

const _resourceScopes = {
  AssignableScopeTypes.department,
  AssignableScopeTypes.team,
  AssignableScopeTypes.client,
  AssignableScopeTypes.project,
};

bool scopeNeedsResource(String scopeType) => _resourceScopes.contains(scopeType);

/// Data scope applied to every role in a member assignment.
class ScopePickerField extends ConsumerWidget {
  const ScopePickerField({
    required this.scopeType,
    required this.resourceId,
    required this.onScopeTypeChanged,
    required this.onResourceIdChanged,
    super.key,
  });

  final String scopeType;
  final String? resourceId;
  final ValueChanged<String> onScopeTypeChanged;
  final ValueChanged<String?> onResourceIdChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final scopeOptions = [
      AssignableScopeTypes.organization,
      AssignableScopeTypes.self,
      AssignableScopeTypes.department,
      AssignableScopeTypes.team,
      AssignableScopeTypes.client,
      AssignableScopeTypes.project,
    ];
    final needsResource = scopeNeedsResource(scopeType);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Data scope', style: text.titleSmall),
        SizedBox(height: tokens.sm),
        OptionField<String>(
          label: 'Scope type',
          value: scopeType,
          options: scopeOptions,
          labelOf: _scopeLabel,
          onChanged: (value) {
            if (value == null) return;
            onScopeTypeChanged(value);
            if (!scopeNeedsResource(value)) onResourceIdChanged(null);
          },
        ),
        if (needsResource) ...[
          SizedBox(height: tokens.md),
          _ResourceField(
            scopeType: scopeType,
            value: resourceId,
            onChanged: onResourceIdChanged,
          ),
        ],
      ],
    );
  }

  static String scopeLabel(String scopeType) => _scopeLabel(scopeType);

  static String _scopeLabel(String scopeType) {
    switch (scopeType) {
      case AssignableScopeTypes.organization:
        return 'Whole organization';
      case AssignableScopeTypes.self:
        return 'Only my work';
      case AssignableScopeTypes.department:
        return 'Department';
      case AssignableScopeTypes.team:
        return 'Team';
      case AssignableScopeTypes.client:
        return 'Client';
      case AssignableScopeTypes.project:
        return 'Project';
      default:
        return scopeType;
    }
  }
}

class _ResourceField extends ConsumerWidget {
  const _ResourceField({
    required this.scopeType,
    required this.value,
    required this.onChanged,
  });

  final String scopeType;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    switch (scopeType) {
      case AssignableScopeTypes.department:
        final departments = ref.watch(departmentsProvider);
        return departments.when(
          data: (items) => OptionField<String>(
            label: 'Department',
            value: value,
            options: [for (final item in items) item.id],
            labelOf: (id) => items.where((d) => d.id == id).firstOrNull?.name ?? id,
            validator: (selected) => selected == null ? 'Pick a department' : null,
            onChanged: onChanged,
          ),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.team:
        final teams = ref.watch(teamDirectoryProvider);
        return teams.when(
          data: (directory) => OptionField<String>(
            label: 'Team',
            value: value,
            options: [for (final entry in directory.entries) entry.id],
            labelOf: (id) => directory.nameOf(id) ?? id,
            validator: (selected) => selected == null ? 'Pick a team' : null,
            onChanged: onChanged,
          ),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.client:
        final clients = ref.watch(clientDirectoryProvider);
        return clients.when(
          data: (directory) => OptionField<String>(
            label: 'Client',
            value: value,
            options: [for (final entry in directory.entries) entry.id],
            labelOf: (id) => directory.nameOf(id) ?? id,
            validator: (selected) => selected == null ? 'Pick a client' : null,
            onChanged: onChanged,
          ),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.project:
        final projects = ref.watch(projectDirectoryProvider);
        return projects.when(
          data: (directory) => OptionField<String>(
            label: 'Project',
            value: value,
            options: [for (final entry in directory.entries) entry.id],
            labelOf: (id) => directory.nameOf(id) ?? id,
            validator: (selected) => selected == null ? 'Pick a project' : null,
            onChanged: onChanged,
          ),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

/// Data scopes when assigning roles: multi-select scope types and resources.
class MemberDataScopeField extends ConsumerWidget {
  const MemberDataScopeField({
    required this.roles,
    required this.selectedRoleIds,
    required this.activeScopes,
    required this.resourceIds,
    required this.onActiveScopesChanged,
    required this.onResourceIdsChanged,
    super.key,
  });

  final List<Role> roles;
  final Set<String> selectedRoleIds;
  final Set<String> activeScopes;
  final Map<String, Set<String>> resourceIds;
  final ValueChanged<Set<String>> onActiveScopesChanged;
  final void Function(String scopeType, Set<String> ids) onResourceIdsChanged;

  List<String> _offeredScopes() {
    final union = <String>{};
    for (final role in roles) {
      if (!selectedRoleIds.contains(role.id)) continue;
      union.addAll(
        role.defaultScopeTypes.isEmpty ? [AssignableScopeTypes.organization] : role.defaultScopeTypes,
      );
    }
    return AssignableScopeTypes.values.where(union.contains).toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (selectedRoleIds.isEmpty) return const SizedBox.shrink();

    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final offered = _offeredScopes();
    if (offered.isEmpty) return const SizedBox.shrink();

    final effective = activeScopes.where(offered.contains).toSet();
    final scopes = effective.isNotEmpty ? effective : offered.toSet();

    return FormField<void>(
      validator: (_) {
        for (final scope in scopes) {
          if (scopeNeedsResource(scope) && (resourceIds[scope]?.isEmpty ?? true)) {
            return l10n.teamDataScopeResourceRequired;
          }
        }
        return null;
      },
      builder: (state) => SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.teamDataScopeTitle, style: text.titleSmall),
            SizedBox(height: tokens.xs),
            Text(l10n.teamDataScopeHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
            SizedBox(height: tokens.sm),
            Wrap(
              spacing: tokens.xs,
              runSpacing: tokens.xs,
              children: [
                for (final scope in offered)
                  FilterChip(
                    label: Text(scopeTypeLabel(scope)),
                    selected: scopes.contains(scope),
                    onSelected: (on) {
                      final next = Set<String>.from(scopes);
                      if (on) {
                        next.add(scope);
                      } else if (next.length > 1) {
                        next.remove(scope);
                      }
                      onActiveScopesChanged(next);
                      state.didChange(null);
                    },
                  ),
              ],
            ),
            if (state.hasError) ...[
              SizedBox(height: tokens.sm),
              Text(state.errorText ?? '', style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
            ],
            for (final scope in scopes.where(scopeNeedsResource)) ...[
              SizedBox(height: tokens.md),
              ResourceMultiPicker(
                scopeType: scope,
                selectedIds: resourceIds[scope] ?? const {},
                onChanged: (ids) {
                  onResourceIdsChanged(scope, ids);
                  state.didChange(null);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ResourceMultiPicker extends ConsumerWidget {
  const ResourceMultiPicker({
    required this.scopeType,
    required this.selectedIds,
    required this.onChanged,
    super.key,
  });

  final String scopeType;
  final Set<String> selectedIds;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final label = ScopePickerField.scopeLabel(scopeType);

    Widget buildList(List<({String id, String name})> items) {
      if (items.isEmpty) {
        return Text('No $label records yet.', style: text.bodySmall?.copyWith(color: tokens.muted));
      }
      return Column(
        children: [
          for (final item in items)
            CheckboxListTile(
              value: selectedIds.contains(item.id),
              onChanged: (on) {
                final next = Set<String>.from(selectedIds);
                if (on == true) {
                  next.add(item.id);
                } else {
                  next.remove(item.id);
                }
                onChanged(next);
              },
              title: Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              controlAffinity: ListTileControlAffinity.leading,
              dense: true,
            ),
        ],
      );
    }

    switch (scopeType) {
      case AssignableScopeTypes.department:
        final departments = ref.watch(departmentsProvider);
        return departments.when(
          data: (items) => buildList([for (final d in items) (id: d.id, name: d.name)]),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.team:
        final teams = ref.watch(teamDirectoryProvider);
        return teams.when(
          data: (directory) => buildList([
            for (final entry in directory.entries) (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
          ]),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.client:
        final clients = ref.watch(clientDirectoryProvider);
        return clients.when(
          data: (directory) => buildList([
            for (final entry in directory.entries) (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
          ]),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      case AssignableScopeTypes.project:
        final projects = ref.watch(projectDirectoryProvider);
        return projects.when(
          data: (directory) => buildList([
            for (final entry in directory.entries) (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
          ]),
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => Text('$error'),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
