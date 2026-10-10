import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/contracts/contracts.g.dart';
import '../../../../core/formatting/formats.dart';
import '../../../../core/theme/app_tokens.dart';
import '../../../../core/widgets/app_dialog.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../../core/widgets/surfaces.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../access/application/access_controller.dart';
import '../../../templates/application/templates_controller.dart';
import '../../../templates/domain/template.dart';
import '../../application/team_controller.dart';
import '../../domain/member.dart';
import '../team_labels.dart';

class MemberDocumentsTab extends ConsumerWidget {
  const MemberDocumentsTab({required this.member, super.key});

  final Member member;

  Future<void> _send(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final templates = (ref.read(templatesProvider).value ?? const <Template>[])
        .where((t) => isHrTemplate(t.type))
        .toList();
    if (templates.isEmpty) {
      showToast(context, l10n.hrTemplatesEmpty);
      return;
    }
    final docType = await showPickerDialog<String>(
      context,
      title: l10n.memberPickDocumentType,
      options: [
        for (final type in MemberDocumentTypes.values)
          PickerOption(value: type, label: memberDocumentTypeLabel(l10n, type)),
      ],
    );
    if (docType == null || !context.mounted) return;

    final template = await showPickerDialog<Template>(
      context,
      title: l10n.memberPickTemplate,
      options: [
        for (final t in templates)
          if (hrDocumentTypeForTemplate(t.type) == docType || docType == MemberDocumentTypes.other)
            PickerOption(value: t, label: t.name, subtitle: t.definition.description),
      ],
    );
    if (template == null || !context.mounted) return;

    final ok = await runAction(
      context,
      () => ref.read(teamActionsProvider).sendDocument(
        member.userId,
        type: docType,
        title: template.name,
        templateId: template.id,
      ),
      success: l10n.memberDocumentSent(member.name),
    );
    if (ok) ref.invalidate(memberDocumentsProvider(member.userId));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final canSend = ref.watch(accessPolicyProvider).can(Permissions.membersEdit);
    final docs = ref.watch(memberDocumentsProvider(member.userId));

    return docs.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(error: e, onRetry: () => ref.invalidate(memberDocumentsProvider(member.userId))),
      data: (items) {
        return ListView(
          padding: EdgeInsets.all(tokens.lg),
          children: [
            if (canSend && member.isStaff)
              FilledButton.icon(
                onPressed: () => _send(context, ref),
                icon: const Icon(Icons.send_outlined),
                label: Text(l10n.memberSendDocument),
              ),
            if (canSend && member.isStaff) SizedBox(height: tokens.lg),
            if (items.isEmpty)
              EmptyState(icon: Icons.description_outlined, title: l10n.memberDocumentsEmpty)
            else
              SectionCard(
                title: l10n.memberTabDocuments,
                child: Column(
                  children: [
                    for (final (i, doc) in items.indexed) ...[
                      if (i > 0) Divider(height: 1, color: tokens.border),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.insert_drive_file_outlined),
                        title: Text(doc.title),
                        subtitle: Text(
                          '${memberDocumentTypeLabel(l10n, doc.type)} · ${formats.date(doc.createdAt)}',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}
