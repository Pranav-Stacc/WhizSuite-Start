import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../domain/calendar_entry.dart';
import 'calendar_source.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Time wording for [entry] as shown on [day]: all-day, a time range, or the part of a
/// multi-day span that falls on that day.
String entryTimeLabel(BuildContext context, CalendarEntry entry, DateTime day) {
  final l10n = AppLocalizations.of(context);
  final formats = context.formats;
  if (entry.allDay) return l10n.calendarAllDay;
  final end = entry.end;
  final first = day == entry.firstDay;
  final last = day == entry.lastDay;
  if (first && last) {
    return end == null || !end.isAfter(entry.start)
        ? formats.time(entry.start)
        : l10n.calendarTimeRange(formats.time(entry.start), formats.time(end));
  }
  if (first) return formats.time(entry.start);
  if (last && end != null) return l10n.calendarUntil(formats.time(end));
  return l10n.calendarAllDay;
}

/// "Client · Project" context line for an entry; empty when neither is known.
String entryContextLabel(Directory clients, Directory projects, CalendarEntry entry) {
  final clientId = entry.clientId;
  final projectId = entry.projectId;
  return [
    if (clientId != null) ?clients.nameOf(clientId),
    if (projectId != null) ?projects.nameOf(projectId),
  ].join(' · ');
}

/// Entries of one day as tappable tiles.
class DayAgenda extends StatelessWidget {
  const DayAgenda({required this.day, required this.entries, required this.onOpen, super.key});

  final DateTime day;
  final List<CalendarEntry> entries;
  final ValueChanged<CalendarEntry> onOpen;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (index, entry) in entries.indexed)
          Padding(
            padding: EdgeInsets.only(bottom: tokens.sm),
            child: FadeSlideIn(
              index: index,
              child: CalendarEntryTile(entry: entry, day: day, onTap: () => onOpen(entry)),
            ),
          ),
      ],
    );
  }
}

class CalendarEntryTile extends ConsumerWidget {
  const CalendarEntryTile({required this.entry, required this.day, required this.onTap, super.key});

  static const _timeWidth = 76.0;
  static const _barWidth = 3.0;
  static const _barHeight = 36.0;

  final CalendarEntry entry;
  final DateTime day;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final tone = calendarSourceTone(entry.sourceType);
    final color = tone.color(tokens);
    final time = entryTimeLabel(context, entry, day);
    final source = calendarSourceLabel(l10n, entry.sourceType);
    final contextLabel = entryContextLabel(clients, projects, entry);

    return SurfaceCard(
      onTap: onTap,
      padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.md),
      semanticLabel: [time, entry.title, source, if (contextLabel.isNotEmpty) contextLabel].join(', '),
      child: ExcludeSemantics(
        child: Row(
          children: [
            SizedBox(
              width: _timeWidth,
              child: Text(
                time,
                maxLines: 2,
                style: text.labelMedium?.copyWith(color: tokens.secondary, fontFeatures: _tabular),
              ),
            ),
            Container(
              width: _barWidth,
              height: _barHeight,
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(_barWidth)),
            ),
            SizedBox(width: tokens.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(entry.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                  SizedBox(height: tokens.xs),
                  Row(
                    children: [
                      Icon(calendarSourceIcon(entry.sourceType), size: 14, color: color),
                      SizedBox(width: tokens.xs),
                      Flexible(
                        child: Text(
                          contextLabel.isEmpty ? source : '$source · $contextLabel',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.bodySmall?.copyWith(color: tokens.muted),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: tokens.muted),
          ],
        ),
      ),
    );
  }
}
