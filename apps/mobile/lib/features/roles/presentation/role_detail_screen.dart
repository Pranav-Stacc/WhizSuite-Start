import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/roles_controller.dart';
import '../domain/permission_catalog.dart';
import '../domain/role.dart';
import '../roles_routes.dart';
import 'module_scope_section.dart';
import 'permission_labels.dart';
import 'role_card.dart';

/// Fast overview of a role; permissions and module scopes open the editor.
class RoleDetailScreen extends ConsumerWidget {
  const RoleDetailScreen({required this.roleId, super.key});

  final String roleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final roles = ref.watch(rolesProvider);
    final role = roles.value?.where((r) => r.id == roleId).firstOrNull;

    if (roles.hasValue && role == null) {
      return PageScaffold(
        title: l10n.rolesTitle,
        body: EmptyState(icon: Icons.admin_panel_settings_outlined, title: l10n.roleNotFoundTitle, body: l10n.roleNotFoundBody),
      );
    }

    if (role == null) {
      return PageScaffold(
        title: l10n.rolesTitle,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final groups = _groupsForRole(role);
    final kind = l10n.roleKind(RoleOrigins.of(role));

    return PageScaffold(
      title: role.name,
      actions: [
        if (role.isEditable)
          PermissionGate(
            anyOf: const [Permissions.rolesManage],
            child: IconButton(
              tooltip: l10n.roleEdit,
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.push(RolesRoutes.edit(role.id)),
            ),
          )
        else if (role.isOwner)
          Icon(Icons.lock_outline, color: tokens.muted),
        PermissionGate(
          anyOf: const [Permissions.rolesManage],
          child: IconButton(
            tooltip: l10n.roleDuplicate,
            icon: const Icon(Icons.copy_all_outlined),
            onPressed: () => context.push(RolesRoutes.duplicate(role.id)),
          ),
        ),
      ],
      body: ListView(
        padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.xxl),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SectionCard(
                    title: l10n.details,
                    trailing: StatusBadge(label: kind, tone: roleKindTone(role)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          role.description.isEmpty ? l10n.roleNoDescription : role.description,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        SizedBox(height: tokens.md),
                        InfoRow(
                          label: l10n.roleAssignedTo,
                          icon: Icons.people_outline,
                          value: Text(l10n.roleMembers(role.memberCount)),
                        ),
                        InfoRow(
                          label: l10n.rolePermissions,
                          icon: Icons.key_outlined,
                          value: Text(l10n.rolePermissionCount(role.permissionKeys.length)),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: tokens.lg),
                  SectionHeader(title: l10n.roleModuleScopesHeading),
                  SizedBox(height: tokens.sm),
                  Text(
                    l10n.roleModuleScopesDetailHint,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                  ),
                  SizedBox(height: tokens.md),
                  for (final entry in groups) ...[
                    SurfaceCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            permissionGroupLabel(l10n, entry.key),
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          SizedBox(height: tokens.xs),
                          Text(
                            l10n.roleGroupCount(entry.permissions.length, entry.permissions.length),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                          ),
                          ModuleScopeSummary(
                            groupLabel: permissionGroupLabel(l10n, entry.key),
                            scopes: _scopesForModule(role, entry.key),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: tokens.sm),
                  ],
                  if (role.isEditable)
                    PermissionGate(
                      anyOf: const [Permissions.rolesManage],
                      child: FilledButton.icon(
                        onPressed: () => context.push(RolesRoutes.edit(role.id)),
                        icon: const Icon(Icons.tune),
                        label: Text(l10n.roleEditPermissions),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Set<String> _scopesForModule(Role role, String moduleKey) {
    final fromApi = role.moduleScopes[moduleKey];
    if (fromApi != null && fromApi.isNotEmpty) return fromApi;
    return {ScopeTypes.organization};
  }

  List<PermissionGroup> _groupsForRole(Role role) {
    final map = <String, List<PermissionDef>>{};
    for (final key in role.permissionKeys) {
      final group = PermissionDef.groupOf(key);
      (map[group] ??= []).add(PermissionDef(key: key, group: group));
    }
    return [for (final e in map.entries) PermissionGroup(key: e.key, permissions: e.value)];
  }
}
