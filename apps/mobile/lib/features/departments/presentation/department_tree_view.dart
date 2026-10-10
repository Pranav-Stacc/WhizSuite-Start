import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/page_scaffold.dart' show ReadableBody;
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../application/departments_controller.dart';
import '../domain/department.dart';
import 'department_row.dart';

/// Searchable department tree; [onTap] opens the department (detail page, sheet, etc.).
class DepartmentTreeView extends ConsumerStatefulWidget {
  const DepartmentTreeView({required this.onTap, this.compact = false, super.key});

  final ValueChanged<DepartmentNode> onTap;
  final bool compact;

  @override
  ConsumerState<DepartmentTreeView> createState() => _DepartmentTreeViewState();
}

class _DepartmentTreeViewState extends ConsumerState<DepartmentTreeView> {
  final _collapsed = <String>{};
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final tree = ref.watch(departmentTreeProvider);
    return AsyncValueView<List<DepartmentNode>>(
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
                title: AppLocalizations.of(context).departmentsEmpty,
                body: AppLocalizations.of(context).departmentsEmptyBody,
              ),
            ),
          ),
        ),
      ),
      data: _buildTree,
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

    return RefreshIndicator(
      onRefresh: () => ref.refresh(departmentsProvider.future),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          if (!widget.compact)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
              sliver: SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: ReadableBody.maxWidth),
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
                                value: '${roots.fold(0, (sum, root) => sum + root.totalPositions)}',
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
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.sm),
              sliver: SliverToBoxAdapter(
                child: SearchField(hint: l10n.departmentsSearch, onChanged: (q) => setState(() => _query = q)),
              ),
            ),
          if (rows.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(icon: Icons.search_off, title: l10n.searchNoMatches, body: l10n.searchNoMatchesBody),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.xxl),
              sliver: SliverList.builder(
                itemCount: rows.length,
                itemBuilder: (context, index) {
                  final node = rows[index];
                  final id = node.department.id;
                  return Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: ReadableBody.maxWidth),
                      child: FadeSlideIn(
                        index: index,
                        child: DepartmentRow(
                          key: ValueKey(id),
                          node: node,
                          showPath: searching,
                          expanded: expanded.contains(id),
                          onToggle: () => setState(() => _collapsed.contains(id) ? _collapsed.remove(id) : _collapsed.add(id)),
                          onTap: () => widget.onTap(node),
                        ),
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
