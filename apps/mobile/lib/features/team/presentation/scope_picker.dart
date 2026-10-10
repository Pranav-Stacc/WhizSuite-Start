import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../departments/application/departments_controller.dart';
import '../../directory/application/directory_providers.dart';

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
