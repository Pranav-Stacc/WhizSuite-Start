import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/department.dart';

/// One tree row: indentation guides, expand toggle, name and counts.
class DepartmentRow extends StatelessWidget {
  const DepartmentRow({
    required this.node,
    required this.expanded,
    required this.onToggle,
    required this.onTap,
    this.showPath = false,
    super.key,
  });

  static const _indent = 20.0;
  static const _maxIndentLevels = 6;
  static const _toggleSize = 40.0;

  final DepartmentNode node;
  final bool expanded;
  final VoidCallback onToggle;
  final VoidCallback onTap;

  /// Shows the full path instead of relying on indentation (used for search results).
  final bool showPath;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final department = node.department;
    final levels = showPath ? 0 : math.min(node.depth, _maxIndentLevels);
    final positions = l10n.departmentPositions(node.totalPositions);

    return Padding(
      padding: EdgeInsets.only(bottom: tokens.sm),
      child: Semantics(
        button: true,
        expanded: node.hasChildren ? expanded : null,
        label: '${department.name}, $positions',
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            for (var i = 0; i < levels; i++)
              SizedBox(
                width: _indent,
                height: _toggleSize,
                child: Center(child: Container(width: 1, color: tokens.border)),
              ),
            SizedBox.square(
              dimension: _toggleSize,
              child: node.hasChildren && !showPath
                  ? IconButton(
                      tooltip: expanded ? l10n.departmentCollapse : l10n.departmentExpand,
                      onPressed: onToggle,
                      icon: AnimatedRotation(
                        turns: expanded ? 0.25 : 0,
                        duration: AppMotion.fast,
                        child: const Icon(Icons.chevron_right),
                      ),
                    )
                  : Icon(Icons.subdirectory_arrow_right, size: 18, color: tokens.border),
            ),
            Expanded(
              child: SurfaceCard(
                onTap: onTap,
                padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.sm),
                child: ExcludeSemantics(
                  child: Row(
                    children: [
                      Icon(
                        node.hasChildren ? Icons.account_tree_outlined : Icons.folder_outlined,
                        size: 20,
                        color: tokens.secondary,
                      ),
                      SizedBox(width: tokens.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              department.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: text.titleSmall,
                            ),
                            if (showPath && department.path.isNotEmpty)
                              Text(
                                department.path.replaceAll('/', ' › '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: text.bodySmall?.copyWith(color: tokens.muted),
                              )
                            else if (node.hasChildren)
                              Text(
                                l10n.departmentSubCount(node.descendantCount),
                                style: text.bodySmall?.copyWith(color: tokens.muted),
                              ),
                          ],
                        ),
                      ),
                      SizedBox(width: tokens.sm),
                      TagChip(label: positions, icon: Icons.badge_outlined),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
