import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../domain/project.dart';
import 'project_status.dart';

const _tabular = [FontFeature.tabularFigures()];

/// "Oct 1 – Dec 20", or just the known end of the range.
String? projectTimelineLabel(BuildContext context, Project project) {
  final l10n = AppLocalizations.of(context);
  final formats = context.formats;
  final start = project.startDate;
  final end = project.endDate;
  if (start != null && end != null) return l10n.projectDateRange(formats.shortDate(start), formats.shortDate(end));
  if (end != null) return formats.shortDate(end);
  if (start != null) return formats.shortDate(start);
  return null;
}

class ProjectCard extends ConsumerWidget {
  const ProjectCard({required this.project, required this.onTap, this.progress, super.key});

  static const _dotSize = 8.0;
  static const _avatarSize = 24.0;
  static const _iconSize = 14.0;

  final Project project;
  final VoidCallback onTap;

  /// Null when the member cannot see tasks.
  final ProjectProgress? progress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final clientName = clients.nameOf(project.clientId);
    final owner = members.nameOf(project.ownerUserId);
    final budget = project.budgetMinor;
    final end = project.endDate;
    final due = end == null ? null : formats.due(end, done: project.isCompleted);
    final timeline = projectTimelineLabel(context, project);
    final statusLabel = projectStatusLabel(l10n, project.status);
    final meta = text.labelSmall?.copyWith(color: tokens.muted, fontFeatures: _tabular);
    final progressValue = progress;

    return SurfaceCard(
      onTap: onTap,
      semanticLabel: [
        project.name,
        ?clientName,
        statusLabel,
        if (progressValue != null && progressValue.total > 0) l10n.projectProgress(progressValue.done, progressValue.total),
      ].join(', '),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: _dotSize,
                height: _dotSize,
                decoration: BoxDecoration(color: seedColor(project.clientId), shape: BoxShape.circle),
              ),
              SizedBox(width: tokens.sm),
              Expanded(
                child: Text(
                  clientName ?? l10n.valueUnknown,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodySmall?.copyWith(color: tokens.muted),
                ),
              ),
              SizedBox(width: tokens.sm),
              StatusBadge(label: statusLabel, tone: projectStatusTone(project.status)),
            ],
          ),
          SizedBox(height: tokens.sm),
          Text(project.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
          if (project.type != null)
            Text(
              project.type!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: text.bodySmall?.copyWith(color: tokens.muted),
            ),
          if (progressValue != null) ...[
            SizedBox(height: tokens.md),
            Row(
              children: [
                Expanded(
                  child: Text(
                    progressValue.total == 0
                        ? l10n.projectNoTasks
                        : l10n.projectProgress(progressValue.done, progressValue.total),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: meta,
                  ),
                ),
                Text(formats.percent(progressValue.ratio), style: text.labelSmall?.copyWith(fontFeatures: _tabular)),
              ],
            ),
            SizedBox(height: tokens.xs),
            ProgressMeter(
              value: progressValue.ratio,
              tone: progressValue.total > 0 && progressValue.done == progressValue.total ? StatusTone.success : StatusTone.neutral,
              label: l10n.projectProgressLabel,
            ),
          ],
          SizedBox(height: tokens.md),
          Row(
            children: [
              Icon(Icons.account_balance_wallet_outlined, size: _iconSize, color: tokens.muted),
              SizedBox(width: tokens.xs),
              Text(
                budget == null || budget == 0
                    ? l10n.projectNoBudget
                    : formats.money(budget, currency: project.currency, compact: true),
                style: meta,
              ),
              SizedBox(width: tokens.md),
              if (timeline != null)
                Expanded(
                  child: Row(
                    children: [
                      Icon(
                        Icons.event_outlined,
                        size: _iconSize,
                        color: due == null || due.tone == StatusTone.neutral ? tokens.muted : due.tone.color(tokens),
                      ),
                      SizedBox(width: tokens.xs),
                      Flexible(child: Text(timeline, maxLines: 1, overflow: TextOverflow.ellipsis, style: meta)),
                    ],
                  ),
                )
              else
                const Spacer(),
              if (owner != null)
                Tooltip(
                  message: owner,
                  child: InitialsAvatar(name: owner, seed: project.ownerUserId, size: _avatarSize),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
