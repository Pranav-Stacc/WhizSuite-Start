import 'package:flutter/material.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/time_entry.dart';

/// One tracked block: where the time went, the note, duration and billability.
class TimeEntryRow extends StatelessWidget {
  const TimeEntryRow({
    required this.entry,
    required this.projectName,
    required this.clientName,
    this.taskTitle,
    this.personName,
    this.onDelete,
    super.key,
  });

  final TimeEntry entry;
  final String? projectName;
  final String? clientName;
  final String? taskTitle;

  /// Shown in team scope.
  final String? personName;

  /// Null when the member may not delete this entry.
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final title = projectName ?? clientName ?? l10n.timeNoProject;
    final details = [if (projectName != null) ?clientName, ?taskTitle, ?personName].join(' · ');
    final note = entry.note;
    final duration = formats.duration(entry.minutes);
    final billable = entry.billable ? l10n.timeBillable : l10n.timeNonBillable;

    final row = Semantics(
      label: l10n.timeEntrySemantics(title, duration, billable),
      container: true,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: tokens.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InitialsAvatar(name: clientName ?? title, seed: entry.clientId ?? entry.projectId, mark: true, size: 36),
            SizedBox(width: tokens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  if (details.isNotEmpty)
                    Text(
                      details,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                  if (note != null && note != taskTitle) ...[
                    SizedBox(height: tokens.xs),
                    Text(note, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.bodySmall),
                  ],
                ],
              ),
            ),
            SizedBox(width: tokens.md),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  duration,
                  style: text.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                SizedBox(height: tokens.xs),
                StatusBadge(
                  label: billable,
                  tone: entry.billable ? StatusTone.success : StatusTone.neutral,
                  dense: true,
                ),
              ],
            ),
            if (onDelete != null)
              PopupMenuButton<VoidCallback>(
                tooltip: l10n.moreActions,
                onSelected: (action) => action(),
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: onDelete,
                    child: ListTile(
                      leading: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
                      title: Text(l10n.delete, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );

    final delete = onDelete;
    if (delete == null) return row;
    return Dismissible(
      key: ValueKey(entry.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        delete();
        return false;
      },
      background: Container(
        alignment: AlignmentDirectional.centerEnd,
        padding: EdgeInsets.symmetric(horizontal: tokens.lg),
        color: Theme.of(context).colorScheme.error.withValues(alpha: 0.12),
        child: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error),
      ),
      child: row,
    );
  }
}
