import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/roles_controller.dart';
import '../domain/permission_catalog.dart';
import '../domain/role.dart';
import '../roles_routes.dart';
import '../../team/domain/scope_assignment.dart';
import '../domain/permission_module_scopes.dart';
import 'permission_labels.dart';
import 'module_scope_section.dart';
import 'permission_matrix.dart';
import 'role_card.dart';

/// Create (no [roleId]) or edit a role. [templateId] prefills a new role from an existing one.
class RoleEditorScreen extends ConsumerWidget {
  const RoleEditorScreen({this.roleId, this.templateId, super.key});

  final String? roleId;
  final String? templateId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final groups = ref.watch(permissionGroupsProvider);
    final id = roleId;
    final template = templateId;
    final cachedRoles = ref.watch(rolesProvider).value;
    final cachedRole = id == null ? null : cachedRoles?.where((r) => r.id == id).firstOrNull;
    final cachedTemplate = template == null ? null : cachedRoles?.where((r) => r.id == template).firstOrNull;
    final roleAsync = id == null ? null : ref.watch(roleProvider(id));
    final sourceAsync = template == null ? null : ref.watch(roleProvider(template));

    final catalog = groups.value;
    final loadedRole = roleAsync?.value ?? cachedRole;
    final loadedSource = sourceAsync?.value ?? cachedTemplate;
    if (catalog != null && (id == null || loadedRole != null) && (template == null || loadedSource != null)) {
      return _RoleEditor(key: ValueKey(id ?? template), groups: catalog, role: loadedRole, template: loadedSource);
    }

    final failure = [groups, ?roleAsync, ?sourceAsync].where((value) => value.hasError).firstOrNull;
    return PageScaffold(
      title: id == null ? l10n.roleNew : l10n.roleEdit,
      body: AsyncValueView<Object?>(
        value: failure ?? const AsyncLoading<Object?>(),
        onRetry: () {
          ref.invalidate(permissionGroupsProvider);
          ref.invalidate(rolesProvider);
        },
        data: (_) => const SizedBox.shrink(),
      ),
    );
  }
}

class _RoleEditor extends ConsumerStatefulWidget {
  const _RoleEditor({required this.groups, this.role, this.template, super.key});

  final List<PermissionGroup> groups;
  final Role? role;
  final Role? template;

  @override
  ConsumerState<_RoleEditor> createState() => _RoleEditorState();
}

class _RoleEditorState extends ConsumerState<_RoleEditor> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _description;
  late Set<String> _selected;
  late String _initialName;
  late String _initialDescription;
  late Set<String> _initialSelected;
  late Map<String, Set<String>> _moduleScopes;
  late Map<String, Set<String>> _initialModuleScopes;
  final _moduleResources = <String, Map<String, Set<String>>>{};
  final _moduleTargeting = <String, Map<String, ScopeResourceTargeting>>{};
  late Map<String, Map<String, Set<String>>> _initialModuleResources;
  late Map<String, Map<String, ScopeResourceTargeting>> _initialModuleTargeting;
  final _expanded = <String>{};
  String _query = '';
  bool _saving = false;

  Role? get _role => widget.role;
  bool get _readOnly => _role?.isOwner ?? false;
  Set<String> get _catalogKeys => {for (final group in widget.groups) ...group.keys};

  bool get _dirty =>
      !_readOnly &&
      (_name.text.trim() != _initialName ||
          _description.text.trim() != _initialDescription ||
          !setEquals(_selected, _initialSelected) ||
          !_moduleScopesEqual(_moduleScopes, _initialModuleScopes) ||
          !_moduleResourcesEqual(_moduleResources, _initialModuleResources) ||
          !_moduleTargetingEqual(_moduleTargeting, _initialModuleTargeting));

  static bool _moduleScopesEqual(Map<String, Set<String>> a, Map<String, Set<String>> b) {
    if (a.length != b.length) return false;
    for (final entry in a.entries) {
      if (!setEquals(entry.value, b[entry.key] ?? const {})) return false;
    }
    return true;
  }

  static bool _moduleResourcesEqual(
    Map<String, Map<String, Set<String>>> a,
    Map<String, Map<String, Set<String>>> b,
  ) {
    if (a.length != b.length) return false;
    for (final module in a.keys) {
      final left = a[module] ?? const {};
      final right = b[module] ?? const {};
      if (left.length != right.length) return false;
      for (final scope in left.keys) {
        if (!setEquals(left[scope] ?? const {}, right[scope] ?? const {})) return false;
      }
    }
    return true;
  }

  static bool _moduleTargetingEqual(
    Map<String, Map<String, ScopeResourceTargeting>> a,
    Map<String, Map<String, ScopeResourceTargeting>> b,
  ) {
    if (a.length != b.length) return false;
    for (final module in a.keys) {
      final left = a[module] ?? const {};
      final right = b[module] ?? const {};
      if (left.length != right.length) return false;
      for (final scope in left.keys) {
        if (left[scope] != right[scope]) return false;
      }
    }
    return true;
  }

  @override
  void initState() {
    super.initState();
    final role = _role;
    final template = widget.template;
    final catalog = _catalogKeys;
    _initialName = role?.name ?? '';
    _initialDescription = role?.description ?? '';
    _initialSelected = (role?.permissionKeys ?? const <String>{}).intersection(catalog);
    _selected = {...(template?.permissionKeys ?? _initialSelected).intersection(catalog)};
    _moduleScopes = {
      for (final entry in (role?.moduleScopes ?? const {}).entries)
        entry.key: Set<String>.from(entry.value),
    };
    for (final entry in (role?.moduleScopeResources ?? const {}).entries) {
      _moduleResources[entry.key] = {
        for (final e in entry.value.entries) e.key: Set<String>.from(e.value),
      };
      _moduleTargeting[entry.key] = {
        for (final e in entry.value.entries)
          e.key: e.value.isEmpty ? ScopeResourceTargeting.allInOrg : ScopeResourceTargeting.specific,
      };
    }
    for (final group in widget.groups) {
      final hasSelection = group.permissions.any((p) => _selected.contains(p.key));
      if (!hasSelection) continue;
      _moduleScopes.putIfAbsent(group.key, () {
        final fromRole = role?.moduleScopes[group.key];
        if (fromRole != null && fromRole.isNotEmpty) return Set<String>.from(fromRole);
        return {ScopeTypes.organization};
      });
    }
    _initialModuleScopes = {
      for (final entry in _moduleScopes.entries) entry.key: Set<String>.from(entry.value),
    };
    _initialModuleResources = {
      for (final entry in _moduleResources.entries)
        entry.key: {for (final e in entry.value.entries) e.key: Set<String>.from(e.value)},
    };
    _initialModuleTargeting = {
      for (final entry in _moduleTargeting.entries) entry.key: Map<String, ScopeResourceTargeting>.from(entry.value),
    };
    _name = TextEditingController(text: role?.name ?? '');
    _description = TextEditingController(text: role?.description ?? template?.description ?? '');
    _name.addListener(_onEdited);
    _description.addListener(_onEdited);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final template = widget.template;
    if (template != null && _name.text.isEmpty) {
      final name = AppLocalizations.of(context).roleDuplicateName(template.name);
      _name.text = name.length > roleNameMaxLength ? name.substring(0, roleNameMaxLength) : name;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  void _onEdited() => setState(() {});

  void _toggle(String key, bool granted) => setState(() {
        final groupKey = PermissionDef.groupOf(key);
        if (granted) {
          _selected.add(key);
          _expanded.add(groupKey);
          _moduleScopes.putIfAbsent(groupKey, () => {ScopeTypes.organization});
        } else {
          _selected.remove(key);
        }
      });

  void _toggleGroup(PermissionGroup group, bool grant) => setState(() {
        if (grant) {
          _selected.addAll(group.keys);
          _expanded.add(group.key);
          _moduleScopes.putIfAbsent(group.key, () => {ScopeTypes.organization});
        } else {
          _selected.removeAll(group.keys);
        }
      });

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    final existing = _role;
    final permissionScopes = buildPermissionScopes(
      _selected,
      _moduleScopes,
      moduleResources: _moduleResources,
      moduleTargeting: _moduleTargeting,
    );
    final scopeUnion = permissionScopes
        .expand((row) => (row['scopeTypes'] as List<Object>).cast<String>())
        .toSet()
        .toList();
    final input = RoleInput(
      name: _name.text.trim(),
      description: _description.text.trim(),
      permissionKeys: _selected,
      kind: existing?.kind ?? RoleKinds.access,
      defaultScopeTypes: scopeUnion.isNotEmpty ? scopeUnion : const [ScopeTypes.organization],
      permissionScopes: permissionScopes,
    );
    final actions = ref.read(rolesActionsProvider);
    final role = _role;
    setState(() => _saving = true);
    Role? saved;
    final ok = await runAction(
      context,
      () async {
        if (role == null) {
          saved = await actions.create(input);
        } else {
          await actions.update(role.id, input);
          saved = role;
        }
      },
      success: role == null ? l10n.createdToast : l10n.savedToast,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!ok) return;
    _initialName = input.name;
    _initialDescription = input.description;
    _initialSelected = {..._selected};
    _initialModuleScopes = {
      for (final entry in _moduleScopes.entries) entry.key: Set<String>.from(entry.value),
    };
    _initialModuleResources = {
      for (final entry in _moduleResources.entries)
        entry.key: {for (final e in entry.value.entries) e.key: Set<String>.from(e.value)},
    };
    _initialModuleTargeting = {
      for (final entry in _moduleTargeting.entries) entry.key: Map<String, ScopeResourceTargeting>.from(entry.value),
    };
    final target = saved ?? role;
    if (target == null) {
      context.go(RolesRoutes.root);
      return;
    }
    context.go(RolesRoutes.detail(target.id));
  }

  Future<void> _delete(Role role) async {
    final l10n = AppLocalizations.of(context);
    if (role.memberCount > 0) {
      showToast(context, l10n.roleInUse(role.memberCount));
      return;
    }
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(role.name),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    final ok = await runAction(context, () => ref.read(rolesActionsProvider).delete(role.id), success: l10n.deletedToast);
    if (ok && mounted) context.go(RolesRoutes.root);
  }

  Future<void> _confirmLeave() async {
    final l10n = AppLocalizations.of(context);
    final discard = await confirmAction(
      context,
      title: l10n.roleUnsavedTitle,
      body: l10n.roleUnsavedBody,
      confirmLabel: l10n.roleDiscard,
      destructive: true,
    );
    if (!discard || !mounted) return;
    setState(() {
      _initialName = _name.text.trim();
      _initialDescription = _description.text.trim();
      _initialSelected = {..._selected};
    });
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final role = _role;
    final visible = filterGroups(
      widget.groups,
      _query,
      (permission) => '${permissionGroupLabel(l10n, permission.group)} ${permissionActionLabel(l10n, permission.action)}',
      (group) => permissionGroupLabel(l10n, group),
    );
    final searching = _query.trim().isNotEmpty;
    final allExpanded = widget.groups.every((g) => _expanded.contains(g.key));
    final total = _catalogKeys.length;

    Widget scopeFooter(PermissionGroup group) {
      if (_readOnly || !group.permissions.any((p) => _selected.contains(p.key))) {
        return const SizedBox.shrink();
      }
      final allowed = allowedScopesForGroup(group.key, group.keys);
      return ModuleScopeEditor(
        groupLabel: permissionGroupLabel(l10n, group.key),
        moduleKey: group.key,
        allowedScopes: allowed,
        scopes: _moduleScopes[group.key] ?? {ScopeTypes.organization},
        resourceIdsByScope: _moduleResources[group.key] ?? const {},
        targetingByScope: _moduleTargeting[group.key] ?? const {},
        onScopesChanged: (next) => setState(() => _moduleScopes[group.key] = next),
        onResourceIdsChanged: (scopeType, ids) => setState(() {
          (_moduleResources[group.key] ??= {})[scopeType] = ids;
        }),
        onTargetingChanged: (scopeType, mode) => setState(() {
          (_moduleTargeting[group.key] ??= {})[scopeType] = mode;
        }),
      );
    }

    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: PageScaffold(
        title: role?.name ?? l10n.roleNew,
        actions: [
          if (role != null && role.isEditable)
            PermissionGate(
              anyOf: const [Permissions.rolesManage],
              child: IconButton(
                tooltip: l10n.roleDelete,
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _delete(role),
              ),
            ),
          if (role != null)
            PermissionGate(
              anyOf: const [Permissions.rolesManage],
              child: IconButton(
                tooltip: l10n.roleDuplicate,
                icon: const Icon(Icons.copy_all_outlined),
                onPressed: () => context.push(RolesRoutes.duplicate(role.id)),
              ),
            ),
        ],
        body: Form(
          key: _formKey,
          child: Column(
            children: [
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.md),
                      sliver: SliverToBoxAdapter(
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (role != null && role.isOwner)
                                  _ReadOnlyBanner(onDuplicate: () => context.push(RolesRoutes.duplicate(role.id))),
                                if (role != null && role.isOwner) SizedBox(height: tokens.md),
                                SectionCard(
                                  title: l10n.details,
                                  trailing: role == null
                                      ? null
                                      : StatusBadge(label: l10n.roleKind(RoleOrigins.of(role)), tone: roleKindTone(role)),
                                  child: Column(
                                    children: [
                                      TextFormField(
                                        controller: _name,
                                        enabled: !_readOnly,
                                        autofocus: role == null && widget.template == null,
                                        decoration: InputDecoration(labelText: l10n.roleName, hintText: l10n.roleNameHint),
                                        textInputAction: TextInputAction.next,
                                        maxLength: roleNameMaxLength,
                                        validator: Validators(l10n).minLength(resourceNameMinLength),
                                      ),
                                      SizedBox(height: tokens.sm),
                                      TextFormField(
                                        controller: _description,
                                        enabled: !_readOnly,
                                        decoration: InputDecoration(
                                          labelText: l10n.roleDescription,
                                          hintText: l10n.roleDescriptionHint,
                                        ),
                                        minLines: 1,
                                        maxLines: 3,
                                        maxLength: roleDescriptionMaxLength,
                                      ),
                                      if (role != null) ...[
                                        SizedBox(height: tokens.sm),
                                        InfoRow(
                                          label: l10n.roleAssignedTo,
                                          icon: Icons.people_outline,
                                          value: Text(l10n.roleMembers(role.memberCount)),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                SizedBox(height: tokens.md),
                                SectionHeader(
                                  title: l10n.rolePermissions,
                                  trailing: TextButton(
                                    onPressed: () => setState(() {
                                      if (allExpanded) {
                                        _expanded.clear();
                                      } else {
                                        _expanded.addAll(widget.groups.map((g) => g.key));
                                      }
                                    }),
                                    child: Text(allExpanded ? l10n.roleCollapseAll : l10n.roleExpandAll),
                                  ),
                                ),
                                SearchField(hint: l10n.rolePermissionsSearch, onChanged: (q) => setState(() => _query = q)),
                                FormField<Set<String>>(
                                  validator: (_) {
                                    final isWorkflow = (_role?.kind ?? RoleKinds.access) == RoleKinds.workflow;
                                    if (isWorkflow || _selected.isNotEmpty) return null;
                                    return l10n.rolePermissionsRequired;
                                  },
                                  builder: (state) => Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      ProgressMeter(
                                        value: total == 0 ? 0 : _selected.length / total,
                                        label: l10n.rolePermissionsSelected(_selected.length, total),
                                      ),
                                      if (state.hasError) ...[
                                        SizedBox(height: tokens.sm),
                                        Text(
                                          state.errorText ?? '',
                                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                if (visible.isEmpty)
                                  Padding(
                                    padding: EdgeInsets.symmetric(vertical: tokens.xl),
                                    child: Text(
                                      l10n.rolePermissionsNoMatch,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: tokens.muted),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.xxl),
                      sliver: SliverList.separated(
                        itemCount: visible.length,
                        separatorBuilder: (_, _) => SizedBox(height: tokens.sm),
                        itemBuilder: (context, index) {
                          final group = visible[index];
                          return Center(
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
                              child: RepaintBoundary(
                                child: PermissionGroupCard(
                                  group: group,
                                  selected: _selected,
                                  readOnly: _readOnly,
                                  expanded: searching || _expanded.contains(group.key),
                                  onExpandedChanged: (open) =>
                                      setState(() => open ? _expanded.add(group.key) : _expanded.remove(group.key)),
                                  onToggle: _toggle,
                                  onToggleGroup: (grant) => _toggleGroup(group, grant),
                                  scopeFooter: scopeFooter(group),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              if (!_readOnly)
                _SaveBar(
                  summary: l10n.rolePermissionsSelected(_selected.length, total),
                  label: role == null ? l10n.roleCreate : l10n.save,
                  saving: _saving,
                  onSave: role == null || _dirty ? _save : null,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReadOnlyBanner extends StatelessWidget {
  const _ReadOnlyBanner({required this.onDuplicate});

  final VoidCallback onDuplicate;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return SurfaceCard(
      child: Row(
        children: [
          Icon(Icons.lock_outline, color: tokens.secondary),
          SizedBox(width: tokens.md),
          Expanded(child: Text(l10n.roleSystemReadOnly, style: Theme.of(context).textTheme.bodyMedium)),
          SizedBox(width: tokens.sm),
          PermissionGate(
            anyOf: const [Permissions.rolesManage],
            child: TextButton(onPressed: onDuplicate, child: Text(l10n.roleDuplicate)),
          ),
        ],
      ),
    );
  }
}

/// Sticky footer with the selection summary and the primary save action.
class _SaveBar extends StatelessWidget {
  const _SaveBar({required this.summary, required this.label, required this.saving, required this.onSave});

  static const _spinnerSize = 18.0;

  final String summary;
  final String label;
  final bool saving;
  final VoidCallback? onSave;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Material(
      color: tokens.surface,
      child: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: tokens.border))),
        child: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
                child: Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        liveRegion: true,
                        child: Text(
                          summary,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.secondary),
                        ),
                      ),
                    ),
                    SizedBox(width: tokens.md),
                    FilledButton(
                      onPressed: saving ? null : onSave,
                      child: saving
                          ? SizedBox.square(
                              dimension: _spinnerSize,
                              child: CircularProgressIndicator(strokeWidth: 2, color: tokens.onPrimary),
                            )
                          : Text(label),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
