import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/app_dialog.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/page_scaffold.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/presentation/permission_gate.dart';
import '../../../team/application/team_controller.dart';
import '../../../team/domain/member.dart';
import '../../../team/team_routes.dart';
import '../../application/departments_controller.dart';
import '../../domain/department.dart';
import '../../departments_routes.dart';
import '../department_forms.dart';

enum _DeptMenu { delete }

class DepartmentDetailScreen extends ConsumerWidget {
  const DepartmentDetailScreen({required this.departmentId, super.key});

  final String departmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tree = ref.watch(departmentTreeProvider);
    return PageScaffold(
      title: l10n.departmentsTitle,
      body: tree.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorState(error: e, onRetry: () => ref.invalidate(departmentsProvider)),
        data: (roots) {
          final node = _findNode(roots, departmentId);
          if (node == null) return EmptyState(icon: Icons.account_tree_outlined, title: l10n.errorNotFound);
          return _DepartmentDetailBody(node: node);
        },
      ),
    );
  }

  DepartmentNode? _findNode(List<DepartmentNode> roots, String id) {
    for (final root in roots) {
      final found = _walk(root, id);
      if (found != null) return found;
    }
    return null;
  }

  DepartmentNode? _walk(DepartmentNode node, String id) {
    if (node.department.id == id) return node;
    for (final child in node.children) {
      final found = _walk(child, id);
      if (found != null) return found;
    }
    return null;
  }
}

class _DepartmentDetailBody extends ConsumerWidget {
  const _DepartmentDetailBody({required this.node});

  final DepartmentNode node;

  Future<void> _deleteDepartment(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(node.department.name),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    final ok = await runAction(
      context,
      () => ref.read(departmentsActionsProvider).delete(node.department.id),
      success: l10n.deletedToast,
    );
    if (ok && context.mounted) context.go(DepartmentsRoutes.root);
  }

  Future<void> _deletePosition(BuildContext context, WidgetRef ref, String positionId) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.deleteConfirmTitle(l10n.departmentPositionsLabel),
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;
    await runAction(
      context,
      () => ref.read(departmentsActionsProvider).deletePosition(positionId),
      success: l10n.deletedToast,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final department = node.department;
    final members = ref.watch(membersProvider).value ?? const <Member>[];
    final inDepartment = members
        .where((m) => m.positions.any((p) => p.departmentId == department.id))
        .toList();

    return ListView(
      padding: EdgeInsets.all(tokens.lg),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(department.name, style: text.headlineSmall)),
                    PermissionGate(
                      anyOf: const [Permissions.orgSettingsManage],
                      child: PopupMenuButton<_DeptMenu>(
                        tooltip: l10n.moreActions,
                        onSelected: (_) => _deleteDepartment(context, ref),
                        itemBuilder: (_) => [
                          PopupMenuItem(
                            value: _DeptMenu.delete,
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                              title: Text(l10n.delete),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (department.path.contains('/'))
                  Text(department.path.replaceAll('/', ' › '), style: text.bodySmall?.copyWith(color: tokens.muted)),
                SizedBox(height: tokens.lg),
                SectionCard(
                  title: l10n.departmentPositionsLabel,
                  trailing: PermissionGate(
                    anyOf: const [Permissions.orgSettingsManage],
                    child: IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: () => _addPosition(context, ref),
                    ),
                  ),
                  child: department.positions.isEmpty
                      ? Text(l10n.departmentPositionsEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
                      : Column(
                          children: [
                            for (final position in department.positions)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(position.name),
                                subtitle: Text(l10n.roleMembers(position.memberCount)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (position.isHead) TagChip(label: l10n.departmentHead),
                                    PermissionGate(
                                      anyOf: const [Permissions.orgSettingsManage],
                                      child: IconButton(
                                        icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 20),
                                        onPressed: () => _deletePosition(context, ref, position.id),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                ),
                SizedBox(height: tokens.lg),
                SectionCard(
                  title: l10n.teamTabMembers,
                  child: inDepartment.isEmpty
                      ? Text(l10n.teamEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
                      : Column(
                          children: [
                            for (final member in inDepartment)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(member.name),
                                subtitle: Text(member.positions.where((p) => p.departmentId == department.id).map((p) => p.name).join(', ')),
                                onTap: () => context.push(TeamRoutes.member(member.userId)),
                              ),
                          ],
                        ),
                ),
                if (node.hasChildren) ...[
                  SizedBox(height: tokens.lg),
                  SectionCard(
                    title: l10n.departmentSubDepartments,
                    child: Column(
                      children: [
                        for (final child in node.children)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.folder_outlined),
                            title: Text(child.department.name),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => context.push(DepartmentsRoutes.detail(child.department.id)),
                          ),
                      ],
                    ),
                  ),
                ],
                PermissionGate(
                  anyOf: const [Permissions.orgSettingsManage],
                  child: Padding(
                    padding: EdgeInsets.only(top: tokens.xl),
                    child: FilledButton.icon(
                      onPressed: () async {
                        final created = await showDepartmentForm(context, ref, parentId: department.id);
                        if (created && context.mounted) showToast(context, l10n.createdToast);
                      },
                      icon: const Icon(Icons.add),
                      label: Text(l10n.departmentAddSub),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _addPosition(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final controller = TextEditingController();
    final saved = await showInputDialog(
      context,
      title: l10n.departmentPositionsLabel,
      controller: controller,
      hint: l10n.departmentPositionNameHint,
      maxLength: designationNameMaxLength,
    );
    if (saved != true || !context.mounted) return;
    final name = controller.text.trim();
    if (name.isEmpty) return;
    await runAction(
      context,
      () => ref.read(departmentsActionsProvider).createPosition(node.department.id, name: name),
      success: l10n.createdToast,
    );
  }
}
