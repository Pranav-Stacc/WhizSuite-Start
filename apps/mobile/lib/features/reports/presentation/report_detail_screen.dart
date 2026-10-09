import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../application/reports_controller.dart';
import '../domain/report.dart';
import '../domain/report_snapshot.dart';
import 'report_form.dart';
import 'report_status.dart';

class ReportDetailScreen extends ConsumerWidget {
  const ReportDetailScreen({required this.reportId, super.key});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final report = ref.watch(reportProvider(reportId));
    final loaded = report.value;
    final manage = canManageReports(ref);
    final clients = ref.watch(clientDirectoryProvider).value;

    return PageScaffold(
      title: loaded?.title ?? l10n.reportsTitle,
      actions: [
        if (loaded != null && manage)
          IconButton(
            tooltip: l10n.reportEdit,
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final saved = await showReportForm(context, ref, report: loaded);
              if (saved != null && context.mounted) showToast(context, l10n.savedToast);
            },
          ),
      ],
      body: AsyncValueView<Report>(
        value: report,
        onRetry: () => ref.invalidate(reportProvider(reportId)),
        data: (report) {
          final snapshot = ReportSnapshot.parse(report.snapshot);
          final clientName = clients?.nameOf(report.clientId) ?? l10n.reportClientUnknown;
          var index = 0;
          Widget reveal(Widget child) => FadeSlideIn(index: index++, child: child);
          return ReadableBody(
            onRefresh: () => ref.refresh(reportProvider(reportId).future),
            children: [
              reveal(_Header(report: report, clientName: clientName)),
              if (manage && report.nextStatuses.isNotEmpty) ...[
                SizedBox(height: context.tokens.lg),
                reveal(_StatusFlow(report: report)),
              ],
              SizedBox(height: context.tokens.xl),
              if (snapshot.isEmpty)
                reveal(
                  SectionCard(
                    title: l10n.reportSnapshot,
                    child: Text(l10n.reportSnapshotEmpty, style: TextStyle(color: context.tokens.muted)),
                  ),
                )
              else
                for (final block in _SnapshotView.blocks(context, snapshot)) ...[
                  reveal(block),
                  SizedBox(height: context.tokens.lg),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.report, required this.clientName});

  final Report report;
  final String clientName;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Semantics(header: true, child: Text(report.title, style: text.headlineSmall)),
              ),
              SizedBox(width: tokens.md),
              StatusBadge(label: reportStatusLabel(l10n, report.status), tone: reportStatusTone(report.status)),
            ],
          ),
          SizedBox(height: tokens.md),
          InfoRow(icon: Icons.business_outlined, label: l10n.reportClient, value: Text(clientName)),
          InfoRow(
            icon: Icons.date_range_outlined,
            label: l10n.reportPeriod,
            value: Text(reportPeriod(context, report)),
          ),
          InfoRow(
            icon: Icons.schedule_outlined,
            label: l10n.reportCreated,
            value: Text(context.formats.dateTime(report.createdAt)),
          ),
        ],
      ),
    );
  }
}

/// Lifecycle stepper (draft → ready → sent) with the moves allowed from the current status.
class _StatusFlow extends ConsumerWidget {
  const _StatusFlow({required this.report});

  final Report report;

  Future<void> _move(BuildContext context, WidgetRef ref, String target) async {
    final l10n = AppLocalizations.of(context);
    if (target == ReportStatuses.sent) {
      final confirmed = await confirmAction(
        context,
        title: l10n.reportSendConfirmTitle(report.title),
        body: l10n.reportSendConfirmBody,
        confirmLabel: l10n.reportTransitionAction(target),
      );
      if (!confirmed || !context.mounted) return;
    }
    await runAction(
      context,
      () => ref.read(reportsActionsProvider).setStatus(report.id, target),
      success: l10n.reportTransitionDone(target),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final steps = ReportStatuses.values;
    final current = steps.indexOf(report.status);
    final back = report.nextStatuses.where((s) => steps.indexOf(s) < current);
    final forward = report.nextStatuses.where((s) => steps.indexOf(s) > current);

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            label: l10n.reportStepSemantics(current + 1, steps.length, reportStatusLabel(l10n, report.status)),
            excludeSemantics: true,
            child: Row(
              children: [
                for (final (index, status) in steps.indexed) ...[
                  if (index > 0)
                    Expanded(
                      child: Container(
                        height: 2,
                        margin: EdgeInsets.symmetric(horizontal: tokens.sm),
                        color: index <= current ? tokens.primary : tokens.border,
                      ),
                    ),
                  _Step(label: reportStatusLabel(l10n, status), done: index < current, active: index == current),
                ],
              ],
            ),
          ),
          SizedBox(height: tokens.lg),
          Text(l10n.reportStatusHint(report.status), style: text.bodySmall?.copyWith(color: tokens.muted)),
          SizedBox(height: tokens.md),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            alignment: WrapAlignment.end,
            children: [
              for (final target in back)
                OutlinedButton.icon(
                  onPressed: () => _move(context, ref, target),
                  icon: const Icon(Icons.undo),
                  label: Text(l10n.reportTransitionAction(target)),
                ),
              for (final target in forward)
                FilledButton.icon(
                  onPressed: () => _move(context, ref, target),
                  icon: Icon(target == ReportStatuses.sent ? Icons.send_outlined : Icons.task_alt),
                  label: Text(l10n.reportTransitionAction(target)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({required this.label, required this.done, required this.active});

  static const _dotSize = 24.0;

  final String label;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final reached = done || active;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: AppMotion.medium,
          curve: AppMotion.standard,
          width: _dotSize,
          height: _dotSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: reached ? tokens.primary : tokens.surface,
            border: Border.all(color: reached ? tokens.primary : tokens.border, width: 2),
          ),
          child: done ? Icon(Icons.check, size: 14, color: tokens.onPrimary) : null,
        ),
        SizedBox(height: tokens.xs),
        Text(
          label,
          style: text.labelSmall?.copyWith(
            color: active ? tokens.fg : tokens.muted,
            fontWeight: active ? FontWeight.w600 : null,
          ),
        ),
      ],
    );
  }
}

/// Renders a parsed snapshot as summary, KPI tiles, fact lists and tag groups.
abstract final class _SnapshotView {
  static const _metricTileWidth = 180.0;

  static List<Widget> blocks(BuildContext context, ReportSnapshot snapshot) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final summary = snapshot.summary;
    Widget value(SnapshotFact fact) => switch (fact.flag) {
      true => Text(l10n.reportYes),
      false => Text(l10n.reportNo),
      null => Text(fact.text),
    };

    return [
      if (summary != null) SectionCard(title: l10n.reportSummary, child: SelectableText(summary)),
      if (snapshot.metrics.isNotEmpty)
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(title: l10n.reportHighlights),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = gridColumns(constraints.maxWidth, minTileWidth: _metricTileWidth, max: 4);
                final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                return Wrap(
                  spacing: tokens.md,
                  runSpacing: tokens.md,
                  children: [
                    for (final metric in snapshot.metrics)
                      SizedBox(
                        width: width,
                        child: MetricTile(label: metric.label, value: formats.number(metric.value)),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      if (snapshot.facts.isNotEmpty)
        SectionCard(
          title: l10n.reportDetails,
          child: Column(
            children: [for (final fact in snapshot.facts) InfoRow(label: fact.label, value: value(fact))],
          ),
        ),
      for (final section in snapshot.sections)
        SectionCard(
          title: section.title,
          child: Column(
            children: [for (final fact in section.facts) InfoRow(label: fact.label, value: value(fact))],
          ),
        ),
      for (final group in snapshot.tags)
        SectionCard(
          title: group.title,
          child: Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [for (final tag in group.values) TagChip(label: tag)],
          ),
        ),
    ];
  }
}
