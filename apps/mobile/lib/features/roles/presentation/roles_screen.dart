import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/roles_controller.dart';
import '../domain/role.dart';
import '../roles_routes.dart';
import 'role_card.dart';

class RolesScreen extends ConsumerStatefulWidget {
  const RolesScreen({super.key});

  @override
  ConsumerState<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends ConsumerState<RolesScreen> {
  String? _kind;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final roles = ref.watch(rolesProvider);
    final items = roles.value ?? const <Role>[];
    void create() => context.push(RolesRoutes.create);

    return PageScaffold(
      title: l10n.rolesTitle,
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.rolesManage],
        child: CreateFab(label: l10n.roleNew, onPressed: create),
      ),
      body: ResourceList<Role>(
        value: roles,
        onRefresh: () => ref.refresh(rolesProvider.future),
        minTileWidth: 320,
        tileHeight: 212,
        searchHint: l10n.rolesSearch,
        matches: (role, query) =>
            role.name.toLowerCase().contains(query) || role.description.toLowerCase().contains(query),
        filter: (role) => _kind == null || RoleOrigins.of(role) == _kind,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.rolesSubtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
            SizedBox(height: tokens.md),
            Row(
              children: [
                Expanded(
                  child: MetricTile(
                    label: l10n.roleStatRoles,
                    icon: Icons.admin_panel_settings_outlined,
                    value: '${items.length}',
                  ),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: MetricTile(
                    label: l10n.roleStatCustom,
                    icon: Icons.tune,
                    value: '${items.where((r) => !r.isSystem).length}',
                  ),
                ),
              ],
            ),
            SizedBox(height: tokens.md),
            FilterBar<String>(
              options: RoleOrigins.values,
              selected: _kind,
              labelOf: l10n.roleKind,
              countOf: (kind) => kind == null ? items.length : items.where((r) => RoleOrigins.of(r) == kind).length,
              onSelected: (kind) => setState(() => _kind = kind),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.admin_panel_settings_outlined,
          title: l10n.rolesEmpty,
          body: l10n.rolesEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.rolesManage],
            child: FilledButton.icon(onPressed: create, icon: const Icon(Icons.add), label: Text(l10n.roleNew)),
          ),
        ),
        itemBuilder: (context, role) => RoleCard(role: role, onTap: () => context.push(RolesRoutes.detail(role.id))),
      ),
    );
  }
}
