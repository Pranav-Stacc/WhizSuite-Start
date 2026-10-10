import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
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
import 'permission_labels.dart';
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
    final role = id == null ? null : ref.watch(roleProvider(id));
    final source = template == null ? null : ref.watch(roleProvider(template));

    final catalog = groups.value;
    final loadedRole = role?.value;
    final loadedSource = source?.value;
    if (catalog != null && (role == null || loadedRole != null) && (source == null || loadedSource != null)) {
      return _RoleEditor(key: ValueKey(id ?? template), groups: catalog, role: loadedRole, template: loadedSource);
    }

    final failure = [groups, ?role, ?source].where((value) => value.hasError).firstOrNull;
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
  final _expanded = <String>{};
  String _query = '';
  bool _saving = false;

  Role? get _role => widget.role;
  bool get _readOnly => !(_role?.isEditable ?? true);
  Set<String> get _catalogKeys => {for (final group in widget.groups) ...group.keys};

  bool get _dirty =>
      !_readOnly &&
      (_name.text.trim() != _initialName ||
          _description.text.trim() != _initialDescription ||
          !setEquals(_selected, _initialSelected));

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

  void _toggle(String key, bool granted) => setState(() => granted ? _selected.add(key) : _selected.remove(key));

  void _toggleGroup(PermissionGroup group, bool grant) => setState(() {
        if (grant) {
          _selected.addAll(group.keys);
        } else {
          _selected.removeAll(group.keys);
        }
      });

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    final existing = _role;
    final input = RoleInput(
      name: _name.text.trim(),
      description: _description.text.trim(),
      permissionKeys: _selected,
      kind: existing?.kind ?? RoleKinds.access,
      defaultScopeTypes: existing?.defaultScopeTypes ?? const [ScopeTypes.organization],
    );
    final actions = ref.read(rolesActionsProvider);
    final role = _role;
    setState(() => _saving = true);
    final ok = await runAction(
      context,
      () => role == null ? actions.create(input) : actions.update(role.id, input),
      success: role == null ? l10n.createdToast : l10n.savedToast,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!ok) return;
    _initialName = input.name;
    _initialDescription = input.description;
    _initialSelected = {..._selected};
    context.go(RolesRoutes.root);
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

    final sections = <Widget>[
      if (role != null && !role.isEditable)
        _ReadOnlyBanner(onDuplicate: () => context.push(RolesRoutes.duplicate(role.id))),
      SectionCard(
        title: l10n.details,
        trailing: role == null ? null : StatusBadge(label: l10n.roleKind(RoleOrigins.of(role)), tone: roleKindTone(role)),
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
              decoration: InputDecoration(labelText: l10n.roleDescription, hintText: l10n.roleDescriptionHint),
              minLines: 1,
              maxLines: 3,
              maxLength: roleDescriptionMaxLength,
            ),
            if (role != null) ...[
              SizedBox(height: tokens.sm),
              InfoRow(label: l10n.roleAssignedTo, icon: Icons.people_outline, value: Text(l10n.roleMembers(role.memberCount))),
            ],
          ],
        ),
      ),
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
              Text(state.errorText ?? '', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
      ),
      if (visible.isEmpty)
        Padding(
          padding: EdgeInsets.symmetric(vertical: tokens.xl),
          child: Text(l10n.rolePermissionsNoMatch, textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
        ),
      for (final group in visible)
        PermissionGroupCard(
          group: group,
          selected: _selected,
          readOnly: _readOnly,
          expanded: searching || _expanded.contains(group.key),
          onExpandedChanged: (open) => setState(() => open ? _expanded.add(group.key) : _expanded.remove(group.key)),
          onToggle: _toggle,
          onToggleGroup: (grant) => _toggleGroup(group, grant),
        ),
    ];

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
                child: ListView.separated(
                  padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.xxl),
                  itemCount: sections.length,
                  separatorBuilder: (_, _) => SizedBox(height: tokens.md),
                  itemBuilder: (context, index) => Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
                      child: FadeSlideIn(index: index, child: sections[index]),
                    ),
                  ),
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
