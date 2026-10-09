import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/reports_controller.dart';
import '../domain/report.dart';
import 'report_status.dart';

/// Longest narrative summary the form accepts.
const reportSummaryMaxLength = 4000;

/// Staff with `reports.view` (the permission every report endpoint requires) may create and edit;
/// the client portal only reads.
bool canManageReports(WidgetRef ref) {
  final isPortal = ref.watch(sessionProvider.select((s) => s.value?.isClientPortal ?? false));
  final allowed = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.reportsView)));
  return allowed && !isPortal;
}

/// Creates a report, or edits [report]. Resolves to the saved report id, or null when dismissed.
Future<String?> showReportForm(BuildContext context, WidgetRef ref, {Report? report}) async {
  final l10n = AppLocalizations.of(context);
  final validators = Validators(l10n);
  final clients = await ref.read(clientDirectoryProvider.future).catchError((_) => Directory.empty);
  if (!context.mounted) return null;

  final now = DateTime.now();
  final lastMonthStart = DateTime(now.year, now.month - 1);
  final title = TextEditingController(text: report?.title);
  final summary = TextEditingController(text: report?.summary);
  String? clientId = report?.clientId;
  DateTime? start = report?.periodStart ?? lastMonthStart;
  DateTime? end = report?.periodEnd ?? DateTime(now.year, now.month, 0);
  var status = report?.status ?? ReportStatuses.draft;
  String? savedId;

  final clientIds = clients.entries.map((c) => c.id).toList()
    ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));

  final saved = await showFormSheet(
    context,
    title: report == null ? l10n.reportNew : l10n.reportEdit,
    submitLabel: report == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      if (report == null)
        OptionField<String>(
          label: l10n.reportClient,
          value: clientId,
          options: clientIds,
          labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
          validator: (value) => value == null ? l10n.validationRequired : null,
          onChanged: (value) => setState(() => clientId = value),
        ),
      TextFormField(
        controller: title,
        autofocus: report == null,
        decoration: InputDecoration(labelText: l10n.reportTitleLabel),
        maxLength: resourceNameMaxLength,
        textInputAction: TextInputAction.next,
        validator: validators.required,
      ),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: DateField(
              label: l10n.reportPeriodStart,
              value: start,
              required: true,
              onChanged: (value) => setState(() {
                start = value;
                final currentEnd = end;
                if (value != null && currentEnd != null && currentEnd.isBefore(value)) end = value;
              }),
            ),
          ),
          SizedBox(width: context.tokens.md),
          Expanded(
            child: DateField(
              label: l10n.reportPeriodEnd,
              value: end,
              required: true,
              firstDate: start,
              onChanged: (value) => setState(() => end = value),
            ),
          ),
        ],
      ),
      if (report != null)
        OptionField<String>(
          label: l10n.reportStatusLabel,
          value: status,
          options: ReportStatuses.values,
          labelOf: (value) => reportStatusLabel(l10n, value),
          onChanged: (value) => setState(() => status = value ?? status),
        ),
      TextFormField(
        controller: summary,
        decoration: InputDecoration(labelText: l10n.reportSummary, alignLabelWithHint: true),
        minLines: 3,
        maxLines: 8,
        maxLength: reportSummaryMaxLength,
      ),
    ],
    onSubmit: () async {
      final from = start;
      final to = end;
      if (from == null || to == null) return;
      final actions = ref.read(reportsActionsProvider);
      final input = ReportInput(
        clientId: report == null ? clientId : null,
        title: title.text.trim(),
        periodStart: from,
        periodEnd: to.isBefore(from) ? from : to,
        status: report == null || status == report.status ? null : status,
        summary: report == null && summary.text.trim().isEmpty ? null : summary.text,
        baseSnapshot: report?.snapshot,
      );
      if (report == null) {
        savedId = (await actions.create(input)).id;
      } else {
        await actions.update(report.id, input);
        savedId = report.id;
      }
    },
  );
  return saved ? savedId : null;
}
