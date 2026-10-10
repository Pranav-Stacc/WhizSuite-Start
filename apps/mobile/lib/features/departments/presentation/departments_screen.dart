import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart' show CreateFab, PageScaffold;
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../departments_routes.dart';
import 'department_forms.dart';
import 'department_tree_view.dart';

class DepartmentsScreen extends ConsumerWidget {
  const DepartmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);

    Future<void> createDepartment() async {
      final created = await showDepartmentForm(context, ref);
      if (created && context.mounted) showToast(context, l10n.createdToast);
    }

    Future<void> createTeam() async {
      final created = await showTeamForm(context, ref);
      if (created && context.mounted) showToast(context, l10n.departmentTeamCreated);
    }

    return PageScaffold(
      title: l10n.departmentsTitle,
      actions: [
        PermissionGate(
          anyOf: const [Permissions.orgSettingsManage],
          child: IconButton(
            tooltip: l10n.departmentTeamNew,
            icon: const Icon(Icons.group_add_outlined),
            onPressed: createTeam,
          ),
        ),
      ],
      floatingActionButton: PermissionGate(
        anyOf: const [Permissions.orgSettingsManage],
        child: CreateFab(label: l10n.departmentNew, onPressed: createDepartment),
      ),
      body: DepartmentTreeView(
        onTap: (node) => context.push(DepartmentsRoutes.detail(node.department.id)),
      ),
    );
  }
}
