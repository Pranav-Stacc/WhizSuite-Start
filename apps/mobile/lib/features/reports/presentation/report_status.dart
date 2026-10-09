import 'package:flutter/widgets.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/report.dart';

String reportStatusLabel(AppLocalizations l10n, String status) => l10n.reportStatus(status);

StatusTone reportStatusTone(String status) => switch (status) {
  ReportStatuses.ready => StatusTone.info,
  ReportStatuses.sent => StatusTone.success,
  _ => StatusTone.neutral,
};

/// "Oct 1 – Oct 31, 2026"-style period label.
String reportPeriod(BuildContext context, Report report) {
  final formats = context.formats;
  return AppLocalizations.of(
    context,
  ).reportPeriodRange(formats.date(report.periodStart), formats.date(report.periodEnd));
}
