import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../domain/department.dart';
import 'department_forms.dart';

Future<void> showDepartmentSheet(BuildContext context, DepartmentNode node) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _DepartmentSheet(node: node),
    );

class _DepartmentSheet extends ConsumerWidget {
  const _DepartmentSheet({required this.node});

  static const _maxWidth = 640.0;

  final DepartmentNode node;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final department = node.department;
    final createdAt = department.createdAt;
    final muted = text.bodyMedium?.copyWith(color: tokens.muted);

    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxWidth),
        child: ListView(
          shrinkWrap: true,
          padding: EdgeInsets.fromLTRB(tokens.xl, 0, tokens.xl, tokens.xl),
          children: [
            Semantics(header: true, child: Text(department.name, style: text.titleLarge)),
            if (department.path.contains('/'))
              Text(department.path.replaceAll('/', ' › '), style: muted),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.details,
              child: Column(
                children: [
                  InfoRow(
                    label: l10n.departmentSubDepartments,
                    icon: Icons.account_tree_outlined,
                    value: Text('${node.descendantCount}'),
                  ),
                  InfoRow(
                    label: l10n.departmentPositionsLabel,
                    icon: Icons.badge_outlined,
                    value: Text('${node.totalPositions}'),
                  ),
                  if (createdAt != null)
                    InfoRow(
                      label: l10n.departmentCreated,
                      icon: Icons.event_outlined,
                      value: Text(context.formats.date(createdAt)),
                    ),
                ],
              ),
            ),
            SizedBox(height: tokens.lg),
            SectionCard(
              title: l10n.departmentPositionsLabel,
              child: department.positions.isEmpty
                  ? Text(l10n.departmentPositionsEmpty, style: muted)
                  : Wrap(
                      spacing: tokens.sm,
                      runSpacing: tokens.sm,
                      children: [for (final position in department.positions) TagChip(label: position)],
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
                        trailing: Text(l10n.departmentPositions(child.totalPositions), style: muted),
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
    );
  }
}
