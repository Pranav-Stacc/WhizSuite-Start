import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/report.dart';
import 'report_status.dart';

class ReportCard extends StatelessWidget {
  const ReportCard({required this.report, required this.clientName, required this.onTap, super.key});

  final Report report;
  final String clientName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final statusLabel = reportStatusLabel(l10n, report.status);
    final period = reportPeriod(context, report);
    final summary = report.summary;

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: l10n.reportCardSemantics(report.title, clientName, statusLabel, period),
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InitialsAvatar(name: clientName, seed: report.clientId, mark: true, size: 40),
                SizedBox(width: tokens.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(report.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                      Text(
                        clientName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(color: tokens.muted),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: tokens.sm),
                StatusBadge(label: statusLabel, tone: reportStatusTone(report.status)),
              ],
            ),
            SizedBox(height: tokens.md),
            Text(
              summary ?? l10n.reportNoSummary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: text.bodySmall?.copyWith(color: summary == null ? tokens.muted : tokens.secondary),
            ),
            SizedBox(height: tokens.md),
            Row(
              children: [
                Icon(Icons.date_range_outlined, size: 14, color: tokens.muted),
                SizedBox(width: tokens.xs),
                Expanded(
                  child: Text(
                    period,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.labelMedium?.copyWith(color: tokens.secondary),
                  ),
                ),
                Text(context.formats.relative(report.createdAt), style: text.labelSmall?.copyWith(color: tokens.muted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
