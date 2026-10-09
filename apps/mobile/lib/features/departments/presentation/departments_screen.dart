import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/departments_controller.dart';
import '../domain/department.dart';
import 'department_forms.dart';
import 'department_row.dart';
import 'department_sheet.dart';

class DepartmentsScreen extends ConsumerStatefulWidget {
  const DepartmentsScreen({super.key});

  @override
  ConsumerState<DepartmentsScreen> createState() => _DepartmentsScreenState();
}

class _DepartmentsScreenState extends ConsumerState<DepartmentsScreen> {
  /// Collapsed branch ids; branches start open so newly added sub-departments are visible.
  final _collapsed = <String>{};
  String _query = '';

  Future<void> _createDepartment() async {
    final l10n = AppLocalizations.of(context);
    final created = await showDepartmentForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _createTeam() async {
    final l10n = AppLocalizations.of(context);
    final created = await showTeamForm(context, ref);
    if (created && mounted) showToast(context, l10n.departmentTeamCreated);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tree = ref.watch(departmentTreeProvider);
    final createButton = FilledButton.icon(
      onPressed: _createDepartment,
      icon: const Icon(Icons.add),
      label: Text(l10n.departmentNew),
    );

    return PageScaffold(
      title: l10n.departmentsTitle,
      actions: [
        PermissionGate(
          anyOf: const [Permissions.orgSettingsManage],
          child: IconButton(
            tooltip: l10n.departmentTeamNew,
            icon: const Icon(Icons.group_add_outlined),
            onPressed: _createTeam,
          ),
        ),
      ],
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.orgSettingsManage],
        child: CreateFab(label: l10n.departmentNew, onPressed: _createDepartment),
      ),
      body: AsyncValueView<List<DepartmentNode>>(
        value: tree,
        onRetry: () => ref.invalidate(departmentsProvider),
        isEmpty: (roots) => roots.isEmpty,
        empty: RefreshIndicator(
          onRefresh: () => ref.refresh(departmentsProvider.future),
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: constraints.maxHeight,
                child: EmptyState(
                  icon: Icons.account_tree_outlined,
                  title: l10n.departmentsEmpty,
                  body: l10n.departmentsEmptyBody,
                  action: PermissionGate(anyOf: const [Permissions.orgSettingsManage], child: createButton),
                ),
              ),
            ),
          ),
        ),
        data: _buildTree,
      ),
    );
  }

  Widget _buildTree(List<DepartmentNode> roots) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final all = flattenTree(roots);
    final branchIds = [for (final node in all) if (node.hasChildren) node.department.id];
    final expanded = branchIds.where((id) => !_collapsed.contains(id)).toSet();
    final searching = _query.trim().isNotEmpty;
    final rows = searching ? matchingNodes(roots, _query) : visibleNodes(roots, expanded);
    final allOpen = expanded.length == branchIds.length;
    final positions = roots.fold(0, (sum, root) => sum + root.totalPositions);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(departmentsProvider.future),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
            sliver: SliverToBoxAdapter(
              child: _Readable(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: MetricTile(
                            label: l10n.departmentsTitle,
                            icon: Icons.account_tree_outlined,
                            value: '${all.length}',
                            caption: l10n.departmentTopLevel(roots.length),
                          ),
                        ),
                        SizedBox(width: tokens.md),
                        Expanded(
                          child: MetricTile(
                            label: l10n.departmentPositionsLabel,
                            icon: Icons.badge_outlined,
                            value: '$positions',
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: tokens.md),
                    SearchField(hint: l10n.departmentsSearch, onChanged: (q) => setState(() => _query = q)),
                    if (!searching && branchIds.isNotEmpty)
                      Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: TextButton.icon(
                          onPressed: () => setState(() {
                            if (allOpen) {
                              _collapsed.addAll(branchIds);
                            } else {
                              _collapsed.clear();
                            }
                          }),
                          icon: Icon(allOpen ? Icons.unfold_less : Icons.unfold_more),
                          label: Text(allOpen ? l10n.departmentCollapseAll : l10n.departmentExpandAll),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (rows.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(icon: Icons.search_off, title: l10n.searchNoMatches, body: l10n.searchNoMatchesBody),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.xxl * 2),
              sliver: SliverList.builder(
                itemCount: rows.length,
                itemBuilder: (context, index) {
                  final node = rows[index];
                  final id = node.department.id;
                  return _Readable(
                    child: FadeSlideIn(
                      index: index,
                      child: DepartmentRow(
                        key: ValueKey(id),
                        node: node,
                        showPath: searching,
                        expanded: expanded.contains(id),
                        onToggle: () => setState(() => _collapsed.contains(id) ? _collapsed.remove(id) : _collapsed.add(id)),
                        onTap: () => showDepartmentSheet(context, node),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _Readable extends StatelessWidget {
  const _Readable({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth), child: child),
      );
}
