import 'package:flutter/material.dart';

import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/app_dialog.dart';
import '../../../../core/widgets/forms.dart';
import '../../../../l10n/app_localizations.dart';
import '../team_labels.dart';

class MemberListFilters {
  const MemberListFilters({this.membershipType, this.roleId, this.departmentId});

  final String? membershipType;
  final String? roleId;
  final String? departmentId;

  bool get isEmpty => membershipType == null && roleId == null && departmentId == null;

  int get activeCount =>
      (membershipType != null ? 1 : 0) + (roleId != null ? 1 : 0) + (departmentId != null ? 1 : 0);
}

Future<MemberListFilters?> showMemberFiltersSheet(
  BuildContext context, {
  required MemberListFilters initial,
  required List<String> membershipTypes,
  required List<String> roleIds,
  required Map<String, String> roleNames,
  required List<String> departmentIds,
  required Map<String, String> departmentNames,
}) {
  var type = initial.membershipType;
  var roleId = initial.roleId;
  var departmentId = initial.departmentId;
  final l10n = AppLocalizations.of(context);

  return showAppDialog<MemberListFilters>(
    context,
    size: AppDialogSize.standard,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AppDialog(
        title: l10n.memberFilterTitle,
        size: AppDialogSize.standard,
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(const MemberListFilters()),
            child: Text(l10n.memberFilterClear),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(MemberListFilters(
              membershipType: type,
              roleId: roleId,
              departmentId: departmentId,
            )),
            child: Text(l10n.memberFilterApply),
          ),
        ],
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OptionField<String>(
              label: l10n.teamType,
              value: type,
              options: membershipTypes,
              allowNone: true,
              labelOf: (t) => membershipTypeLabel(l10n, t),
              onChanged: (value) => setState(() => type = value),
            ),
            if (roleIds.isNotEmpty) ...[
              SizedBox(height: ctx.tokens.lg),
              OptionField<String>(
                label: l10n.teamRoles,
                value: roleId,
                options: roleIds,
                allowNone: true,
                labelOf: (id) => roleNames[id] ?? id,
                onChanged: (value) => setState(() => roleId = value),
              ),
            ],
            if (departmentIds.isNotEmpty) ...[
              SizedBox(height: ctx.tokens.lg),
              OptionField<String>(
                label: l10n.navDepartments,
                value: departmentId,
                options: departmentIds,
                allowNone: true,
                labelOf: (id) => departmentNames[id] ?? id,
                onChanged: (value) => setState(() => departmentId = value),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
