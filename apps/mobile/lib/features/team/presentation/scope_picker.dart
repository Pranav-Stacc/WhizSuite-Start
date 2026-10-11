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
import '../domain/scope_assignment.dart';

/// Data scope applied to every role in a member assignment (legacy single scope).
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
          labelOf: scopeTypeLabel,
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
class MemberDataScopeField extends ConsumerStatefulWidget {
  const MemberDataScopeField({
    required this.roles,
    required this.selectedRoleIds,
    required this.activeScopes,
    required this.resourceIds,
    required this.resourceTargeting,
    required this.onActiveScopesChanged,
    required this.onResourceIdsChanged,
    required this.onResourceTargetingChanged,
    super.key,
  });

  final List<Role> roles;
  final Set<String> selectedRoleIds;
  final Set<String> activeScopes;
  final Map<String, Set<String>> resourceIds;
  final Map<String, ScopeResourceTargeting> resourceTargeting;
  final ValueChanged<Set<String>> onActiveScopesChanged;
  final void Function(String scopeType, Set<String> ids) onResourceIdsChanged;
  final void Function(String scopeType, ScopeResourceTargeting mode) onResourceTargetingChanged;

  @override
  ConsumerState<MemberDataScopeField> createState() => _MemberDataScopeFieldState();
}

class _MemberDataScopeFieldState extends ConsumerState<MemberDataScopeField> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncActiveScopes());
  }

  @override
  void didUpdateWidget(covariant MemberDataScopeField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedRoleIds != widget.selectedRoleIds || oldWidget.roles != widget.roles) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _syncActiveScopes());
    }
  }

  void _syncActiveScopes() {
    final offered = offeredScopesForRoles(widget.roles, widget.selectedRoleIds);
    final resolved = resolveActiveScopes(widget.activeScopes, offered);
    if (!_setEquals(resolved, widget.activeScopes)) {
      widget.onActiveScopesChanged(resolved);
    }
  }

  bool _setEquals(Set<String> a, Set<String> b) {
    if (a.length != b.length) return false;
    for (final value in a) {
      if (!b.contains(value)) return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.selectedRoleIds.isEmpty) return const SizedBox.shrink();

    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final offered = offeredScopesForRoles(widget.roles, widget.selectedRoleIds);
    if (offered.isEmpty) return const SizedBox.shrink();

    final scopes = resolveActiveScopes(widget.activeScopes, offered);

    return FormField<void>(
      validator: (_) {
        for (final scope in scopes) {
          if (!scopeNeedsResource(scope)) continue;
          final mode = widget.resourceTargeting[scope] ?? ScopeResourceTargeting.allInOrg;
          if (mode == ScopeResourceTargeting.specific && (widget.resourceIds[scope]?.isEmpty ?? true)) {
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
            Text(l10n.teamDataScopeTypesLabel, style: text.labelMedium),
            SizedBox(height: tokens.xs),
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
                        if (scopeNeedsResource(scope)) {
                          widget.onResourceTargetingChanged(scope, ScopeResourceTargeting.specific);
                        }
                      } else if (next.length > 1) {
                        next.remove(scope);
                      }
                      widget.onActiveScopesChanged(next);
                      state.didChange(null);
                    },
                  ),
              ],
            ),
            if (state.hasError) ...[
              SizedBox(height: tokens.sm),
              Text(
                state.errorText ?? '',
                style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error),
              ),
            ],
            for (final scope in scopes.where(scopeNeedsResource)) ...[
              SizedBox(height: tokens.md),
              ResourceMultiPicker(
                scopeType: scope,
                targeting: widget.resourceTargeting[scope] ?? ScopeResourceTargeting.allInOrg,
                selectedIds: widget.resourceIds[scope] ?? const {},
                onTargetingChanged: (mode) {
                  widget.onResourceTargetingChanged(scope, mode);
                  state.didChange(null);
                },
                onChanged: (ids) {
                  widget.onResourceIdsChanged(scope, ids);
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
    required this.targeting,
    required this.selectedIds,
    required this.onTargetingChanged,
    required this.onChanged,
    super.key,
  });

  final String scopeType;
  final ScopeResourceTargeting targeting;
  final Set<String> selectedIds;
  final ValueChanged<ScopeResourceTargeting> onTargetingChanged;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final title = scopeResourceLabel(scopeType, l10n);

    Widget buildList(List<({String id, String name})> items) {
      if (items.isEmpty) {
        return Padding(
          padding: EdgeInsets.all(tokens.sm),
          child: Text(
            l10n.teamDataScopeResourceEmpty(title),
            style: text.bodySmall?.copyWith(color: tokens.muted),
          ),
        );
      }
      return ListView.separated(
        shrinkWrap: true,
        physics: const ClampingScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: tokens.border),
        itemBuilder: (context, index) {
          final item = items[index];
          return CheckboxListTile(
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
            title: Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis),
            controlAffinity: ListTileControlAffinity.leading,
            dense: true,
            contentPadding: EdgeInsets.symmetric(horizontal: tokens.sm),
          );
        },
      );
    }

    Widget body(AsyncValue<List<({String id, String name})>> asyncItems) {
      return asyncItems.when(
        data: buildList,
        loading: () => Padding(
          padding: EdgeInsets.all(tokens.md),
          child: const LinearProgressIndicator(),
        ),
        error: (error, _) => Padding(
          padding: EdgeInsets.all(tokens.sm),
          child: Text('$error', style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
        ),
      );
    }

    final AsyncValue<List<({String id, String name})>> items = switch (scopeType) {
      AssignableScopeTypes.department => ref.watch(departmentsProvider).whenData(
            (list) => [for (final d in list) (id: d.id, name: d.name)],
          ),
      AssignableScopeTypes.team => ref.watch(teamDirectoryProvider).whenData(
            (directory) => [
              for (final entry in directory.entries)
                (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
            ],
          ),
      AssignableScopeTypes.client => ref.watch(clientDirectoryProvider).whenData(
            (directory) => [
              for (final entry in directory.entries)
                (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
            ],
          ),
      AssignableScopeTypes.project => ref.watch(projectDirectoryProvider).whenData(
            (directory) => [
              for (final entry in directory.entries)
                (id: entry.id, name: directory.nameOf(entry.id) ?? entry.id),
            ],
          ),
      _ => const AsyncValue.data([]),
    };

    final allLabel = l10n.teamDataScopeAllResources(title);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: text.titleSmall),
        SizedBox(height: tokens.sm),
        SegmentedButton<ScopeResourceTargeting>(
          segments: [
            ButtonSegment(value: ScopeResourceTargeting.allInOrg, label: Text(allLabel, overflow: TextOverflow.ellipsis)),
            ButtonSegment(value: ScopeResourceTargeting.specific, label: Text(l10n.teamDataScopeChooseResources)),
          ],
          selected: {targeting},
          onSelectionChanged: (set) => onTargetingChanged(set.first),
        ),
        if (targeting == ScopeResourceTargeting.specific) ...[
          SizedBox(height: tokens.sm),
          Text(l10n.teamDataScopeResourceHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
          if (selectedIds.isNotEmpty) ...[
            SizedBox(height: tokens.xs),
            Text(
              l10n.teamDataScopeResourceSelected(selectedIds.length),
              style: text.labelSmall?.copyWith(color: tokens.secondary),
            ),
          ],
          SizedBox(height: tokens.sm),
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: tokens.border),
              borderRadius: tokens.borderRadius,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: body(items),
            ),
          ),
        ] else ...[
          SizedBox(height: tokens.xs),
          Text(l10n.teamDataScopeAllResourcesHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
        ],
      ],
    );
  }
}

String scopeResourceLabel(String scopeType, AppLocalizations l10n) {
  switch (scopeType) {
    case AssignableScopeTypes.department:
      return l10n.teamScopeResourceDepartment;
    case AssignableScopeTypes.team:
      return l10n.teamScopeResourceTeam;
    case AssignableScopeTypes.client:
      return l10n.teamScopeResourceClient;
    case AssignableScopeTypes.project:
      return l10n.teamScopeResourceProject;
    default:
      return scopeTypeLabel(scopeType);
  }
}
