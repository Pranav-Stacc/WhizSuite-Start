import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/agreements_controller.dart';
import '../domain/agreement.dart';
import '../domain/client.dart';

/// Client agreements surface: list, create, upload PDF, typed sign, download.
class AgreementsTab extends ConsumerWidget {
  const AgreementsTab({required this.client, super.key});

  final Client client;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final agreements = ref.watch(clientAgreementsProvider(client.id));

    return Stack(
      children: [
        AsyncValueView<List<Agreement>>(
          value: agreements,
          onRetry: () => ref.invalidate(clientAgreementsProvider(client.id)),
          data: (items) {
            if (items.isEmpty) {
              return ReadableBody(
                onRefresh: () => ref.refresh(clientAgreementsProvider(client.id).future),
                children: [
                  SizedBox(height: tokens.xxl),
                  EmptyState(
                    icon: Icons.description_outlined,
                    title: l10n.agreementsEmptyTitle,
                    body: l10n.agreementsEmptyBody,
                  ),
                ],
              );
            }
            final signed = items.where((a) => a.isSigned).length;
            final drafts = items.where((a) => a.status == AgreementStatuses.draft).length;
            return ReadableBody(
              onRefresh: () => ref.refresh(clientAgreementsProvider(client.id).future),
              children: [
                FadeSlideIn(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final tiles = [
                        MetricTile(
                          label: l10n.agreementsStatTotal,
                          icon: Icons.folder_special_outlined,
                          value: '${items.length}',
                        ),
                        MetricTile(
                          label: l10n.agreementsStatSigned,
                          icon: Icons.verified_outlined,
                          value: '$signed',
                        ),
                        MetricTile(
                          label: l10n.agreementsStatDraft,
                          icon: Icons.edit_note_outlined,
                          value: '$drafts',
                        ),
                      ];
                      final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: 3);
                      return Wrap(
                        spacing: tokens.md,
                        runSpacing: tokens.md,
                        children: [
                          for (final tile in tiles)
                            SizedBox(
                              width: (constraints.maxWidth - tokens.md * (columns - 1)) / columns,
                              child: tile,
                            ),
                        ],
                      );
                    },
                  ),
                ),
                SizedBox(height: tokens.xl),
                for (final (i, agreement) in items.indexed)
                  FadeSlideIn(
                    index: i + 1,
                    child: Padding(
                      padding: EdgeInsets.only(bottom: tokens.md),
                      child: _AgreementCard(client: client, agreement: agreement),
                    ),
                  ),
              ],
            );
          },
        ),
        Positioned(
          right: tokens.lg,
          bottom: tokens.lg,
          child: PermissionGate(
            anyOf: const [Permissions.invoicesCreate],
            child: CreateFab(
              label: l10n.agreementsNew,
              icon: Icons.note_add_outlined,
              onPressed: () => showCreateAgreementSheet(context, ref, client),
            ),
          ),
        ),
      ],
    );
  }
}

class _AgreementCard extends ConsumerWidget {
  const _AgreementCard({required this.client, required this.agreement});

  final Client client;
  final Agreement agreement;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      tokens.primary.withValues(alpha: 0.18),
                      tokens.secondary.withValues(alpha: 0.12),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(tokens.radius + 4),
                ),
                child: Icon(Icons.description_outlined, color: tokens.primary),
              ),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(agreement.title, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                    SizedBox(height: tokens.xs),
                    Text(
                      agreementTypeLabel(l10n, agreement.type),
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                  ],
                ),
              ),
              StatusBadge(
                label: agreementStatusLabel(l10n, agreement.status),
                tone: agreementStatusTone(agreement.status),
              ),
            ],
          ),
          if (agreement.startDate != null || agreement.endDate != null || agreement.signedAt != null) ...[
            SizedBox(height: tokens.md),
            Wrap(
              spacing: tokens.md,
              runSpacing: tokens.xs,
              children: [
                if (agreement.startDate != null)
                  _MetaChip(icon: Icons.play_arrow_outlined, label: agreement.startDate!),
                if (agreement.endDate != null)
                  _MetaChip(icon: Icons.flag_outlined, label: agreement.endDate!),
                if (agreement.signedAt != null)
                  _MetaChip(icon: Icons.draw_outlined, label: formats.date(agreement.signedAt!)),
                if (agreement.signatureName != null)
                  _MetaChip(icon: Icons.person_outline, label: agreement.signatureName!),
              ],
            ),
          ],
          SizedBox(height: tokens.md),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              if (agreement.hasPdf)
                OutlinedButton.icon(
                  onPressed: () => _download(context, ref),
                  icon: const Icon(Icons.download_outlined, size: 18),
                  label: Text(l10n.agreementsDownload),
                ),
              PermissionGate(
                anyOf: const [Permissions.invoicesCreate],
                child: OutlinedButton.icon(
                  onPressed: () => _uploadPdf(context, ref),
                  icon: const Icon(Icons.upload_file_outlined, size: 18),
                  label: Text(l10n.agreementsUploadPdf),
                ),
              ),
              if (!agreement.isSigned) ...[
                PermissionGate(
                  anyOf: const [Permissions.invoicesView],
                  child: FilledButton.tonalIcon(
                    onPressed: () => _sign(context, ref),
                    icon: const Icon(Icons.draw_outlined, size: 18),
                    label: Text(l10n.agreementsSign),
                  ),
                ),
                PermissionGate(
                  anyOf: const [Permissions.invoicesCreate],
                  child: TextButton(
                    onPressed: () => _markSigned(context, ref),
                    child: Text(l10n.agreementsMarkSigned),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _download(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () async {
        final url = await ref.read(agreementsActionsProvider).downloadUrl(agreement.id);
        final ok = await launchUrl(url, mode: LaunchMode.externalApplication);
        if (!ok) throw StateError('launch');
      },
      success: l10n.agreementsDownloadStarted,
    );
  }

  Future<void> _uploadPdf(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final picked = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf'],
      dialogTitle: l10n.agreementsUploadPdf,
    );
    final file = picked.firstOrNull;
    if (file == null || !context.mounted) return;
    final chunks = await file.readAsByteStream().fold<List<int>>(<int>[], (all, chunk) => all..addAll(chunk));
    if (!context.mounted) return;
    await runAction(
      context,
      () => ref.read(agreementsActionsProvider).uploadPdf(
            client.id,
            agreement.id,
            filename: file.name,
            bytes: Uint8List.fromList(chunks),
          ),
      success: l10n.agreementsPdfUploaded,
    );
  }

  Future<void> _sign(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    final validators = Validators(l10n);
    final name = TextEditingController();
    final saved = await showFormSheet(
      context,
      title: l10n.agreementsSignTitle,
      submitLabel: l10n.agreementsSign,
      fields: (context, setState) => [
        Text(l10n.agreementsSignHint, style: TextStyle(color: context.tokens.muted)),
        TextFormField(
          controller: name,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: InputDecoration(labelText: l10n.agreementsSignerName),
          validator: validators.required,
        ),
      ],
      onSubmit: () => ref.read(agreementsActionsProvider).sign(
            client.id,
            agreement.id,
            signerName: name.text.trim(),
          ),
    );
    name.dispose();
    if (saved && context.mounted) showToast(context, l10n.agreementsSignedToast);
  }

  Future<void> _markSigned(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context);
    await runAction(
      context,
      () => ref.read(agreementsActionsProvider).markSigned(client.id, agreement.id),
      success: l10n.agreementsSignedToast,
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: tokens.muted),
          SizedBox(width: tokens.xs),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      ),
    );
  }
}

Future<bool> showCreateAgreementSheet(BuildContext context, WidgetRef ref, Client client) async {
  final l10n = AppLocalizations.of(context);
  final validators = Validators(l10n);
  final title = TextEditingController();
  var type = AgreementTypes.msa;
  DateTime? start;
  DateTime? end;

  final saved = await showFormSheet(
    context,
    title: l10n.agreementsNew,
    submitLabel: l10n.create,
    fields: (context, setState) => [
      Text(
        l10n.agreementsNewHint,
        style: TextStyle(color: context.tokens.muted),
      ),
      TextFormField(
        controller: title,
        autofocus: true,
        textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(labelText: l10n.agreementsTitleLabel),
        maxLength: 200,
        validator: validators.required,
      ),
      OptionField<String>(
        label: l10n.agreementsTypeLabel,
        value: type,
        options: AgreementTypes.values,
        labelOf: (t) => agreementTypeLabel(l10n, t),
        onChanged: (value) => setState(() => type = value ?? type),
      ),
      DateField(
        label: l10n.agreementsStart,
        value: start,
        onChanged: (value) => setState(() => start = value),
      ),
      DateField(
        label: l10n.agreementsEnd,
        value: end,
        onChanged: (value) => setState(() => end = value),
      ),
    ],
    onSubmit: () => ref.read(agreementsActionsProvider).create(
          AgreementInput(
            clientId: client.id,
            title: title.text.trim(),
            type: type,
            startDate: start == null ? null : dateKey(start!),
            endDate: end == null ? null : dateKey(end!),
          ),
        ),
  );
  title.dispose();
  if (saved && context.mounted) showToast(context, l10n.agreementsCreatedToast);
  return saved;
}

String agreementTypeLabel(AppLocalizations l10n, String type) => switch (type) {
      AgreementTypes.nda => l10n.agreementsTypeNda,
      AgreementTypes.msa => l10n.agreementsTypeMsa,
      AgreementTypes.sow => l10n.agreementsTypeSow,
      _ => l10n.agreementsTypeOther,
    };

String agreementStatusLabel(AppLocalizations l10n, String status) => switch (status) {
      AgreementStatuses.draft => l10n.agreementsStatusDraft,
      AgreementStatuses.sent => l10n.agreementsStatusSent,
      AgreementStatuses.signed => l10n.agreementsStatusSigned,
      AgreementStatuses.active => l10n.agreementsStatusActive,
      AgreementStatuses.expired => l10n.agreementsStatusExpired,
      AgreementStatuses.voided => l10n.agreementsStatusVoid,
      _ => status,
    };

StatusTone agreementStatusTone(String status) => switch (status) {
      AgreementStatuses.signed || AgreementStatuses.active => StatusTone.success,
      AgreementStatuses.sent => StatusTone.info,
      AgreementStatuses.expired || AgreementStatuses.voided => StatusTone.danger,
      _ => StatusTone.neutral,
    };
