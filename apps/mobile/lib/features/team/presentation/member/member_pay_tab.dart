import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/forms.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../time/application/time_controller.dart';
import '../../application/team_controller.dart';
import '../../domain/member.dart';
import '../team_labels.dart';

class MemberPayTab extends ConsumerWidget {
  const MemberPayTab({required this.member, super.key});

  final Member member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final canEdit = ref.watch(accessPolicyProvider).can(Permissions.membersEdit);
    final entries = ref.watch(timeEntriesProvider).value ?? const [];
    final minutes = entries.where((e) => e.userId == member.userId).fold<int>(0, (s, e) => s + e.minutes);
    final hours = (minutes / 60).toStringAsFixed(1);

    return ListView(
      padding: EdgeInsets.all(tokens.lg),
      children: [
        SectionCard(
          title: l10n.memberEmploymentType,
          child: canEdit && member.isStaff
              ? OptionField<String>(
                  label: l10n.memberEmploymentType,
                  value: member.employmentType,
                  options: EmploymentTypes.values,
                  allowNone: true,
                  labelOf: (t) => employmentTypeLabel(l10n, t),
                  onChanged: (value) async {
                    await runAction(
                      context,
                      () => ref.read(teamActionsProvider).updateEmployment(member.userId, value),
                      success: l10n.savedToast,
                    );
                  },
                )
              : Text(
                  employmentTypeLabel(l10n, member.employmentType),
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
        ),
        SizedBox(height: tokens.lg),
        SectionCard(
          title: l10n.navTime,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l10n.memberHoursLogged(hours), style: Theme.of(context).textTheme.titleMedium),
              SizedBox(height: tokens.sm),
              Text(
                l10n.memberTabPay,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
