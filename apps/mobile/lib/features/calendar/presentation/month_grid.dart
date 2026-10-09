import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/calendar_entry.dart';
import 'calendar_source.dart';

const _tabular = [FontFeature.tabularFigures()];

/// Six-week month grid. Compact cells show up to [_maxDots] coloured dots per day;
/// roomy cells show the first entries as chips.
class MonthGrid extends StatelessWidget {
  const MonthGrid({
    required this.month,
    required this.selected,
    required this.byDay,
    required this.onSelect,
    required this.roomy,
    super.key,
  });

  static const compactRowHeight = 52.0;
  static const roomyRowHeight = 96.0;
  static const headerHeight = 32.0;

  /// Total height for a grid, so a pager can size itself.
  static double heightFor({required bool roomy}) =>
      headerHeight + gridWeeks * (roomy ? roomyRowHeight : compactRowHeight);

  final DateTime month;
  final DateTime selected;
  final Map<DateTime, List<CalendarEntry>> byDay;
  final ValueChanged<DateTime> onSelect;
  final bool roomy;

  @override
  Widget build(BuildContext context) {
    final material = MaterialLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final tokens = context.tokens;
    final days = monthGrid(month, firstWeekday: material.firstDayOfWeekIndex);
    final today = dayOf(DateTime.now());
    final weekdayFormat = roomy ? DateFormat.E(locale) : DateFormat.EEEEE(locale);

    return Column(
      children: [
        SizedBox(
          height: headerHeight,
          child: ExcludeSemantics(
            child: Row(
              children: [
                for (final day in days.take(daysPerWeek))
                  Expanded(
                    child: Center(
                      child: Text(
                        weekdayFormat.format(day),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        for (var week = 0; week < gridWeeks; week++)
          SizedBox(
            height: roomy ? roomyRowHeight : compactRowHeight,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final day in days.skip(week * daysPerWeek).take(daysPerWeek))
                  Expanded(
                    child: _DayCell(
                      day: day,
                      inMonth: day.month == month.month,
                      isToday: day == today,
                      isSelected: day == selected,
                      entries: byDay[day] ?? const [],
                      roomy: roomy,
                      onTap: () => onSelect(day),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.inMonth,
    required this.isToday,
    required this.isSelected,
    required this.entries,
    required this.roomy,
    required this.onTap,
  });

  static const _maxDots = 3;
  static const _maxChips = 2;
  static const _numberSize = 28.0;
  static const _dotSize = 5.0;
  static const _outsideAlpha = 0.45;
  static const _selectedFillAlpha = 0.08;

  final DateTime day;
  final bool inMonth;
  final bool isToday;
  final bool isSelected;
  final List<CalendarEntry> entries;
  final bool roomy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final dayColor = isSelected ? tokens.onPrimary : (inMonth ? tokens.fg : tokens.muted.withValues(alpha: _outsideAlpha));

    final number = Container(
      width: _numberSize,
      height: _numberSize,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isSelected ? tokens.primary : null,
        border: isToday && !isSelected ? Border.all(color: tokens.primary, width: 1.5) : null,
      ),
      child: Text(
        '${day.day}',
        style: text.labelMedium?.copyWith(
          color: dayColor,
          fontFeatures: _tabular,
          fontWeight: isToday || isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );

    return Semantics(
      button: true,
      selected: isSelected,
      label: l10n.calendarDaySemantics(context.formats.date(day), entries.length),
      excludeSemantics: true,
      child: Material(
        color: isSelected && roomy ? tokens.primary.withValues(alpha: _selectedFillAlpha) : Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: roomy ? Border.all(color: tokens.border, width: 0.5) : null,
            ),
            child: roomy ? _roomy(context, number) : _compact(context, number),
          ),
        ),
      ),
    );
  }

  Widget _compact(BuildContext context, Widget number) {
    final tokens = context.tokens;
    final types = <String>[];
    for (final entry in entries) {
      if (!types.contains(entry.sourceType)) types.add(entry.sourceType);
      if (types.length == _maxDots) break;
    }
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        number,
        SizedBox(height: tokens.xs),
        SizedBox(
          height: _dotSize,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final type in types)
                Container(
                  width: _dotSize,
                  height: _dotSize,
                  margin: const EdgeInsets.symmetric(horizontal: 1),
                  decoration: BoxDecoration(color: calendarSourceTone(type).color(tokens), shape: BoxShape.circle),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _roomy(BuildContext context, Widget number) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final small = Theme.of(context).textTheme.labelSmall;
    final hidden = entries.length - _maxChips;
    // Large text or density can exceed the fixed row height; clip rather than overflow.
    return ClipRect(
      child: OverflowBox(
        alignment: Alignment.topLeft,
        maxHeight: double.infinity,
        child: Padding(
          padding: EdgeInsets.all(tokens.xs),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          number,
          for (final entry in entries.take(_maxChips)) _EntryChip(entry: entry),
          if (hidden > 0)
            Padding(
              padding: EdgeInsets.only(left: tokens.xs),
              child: Text(
                l10n.calendarMoreItems(hidden),
                maxLines: 1,
                overflow: TextOverflow.clip,
                style: small?.copyWith(color: tokens.muted),
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EntryChip extends StatelessWidget {
  const _EntryChip({required this.entry});

  static const _fillAlpha = 0.14;

  final CalendarEntry entry;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final color = calendarSourceTone(entry.sourceType).color(tokens);
    return Container(
      margin: const EdgeInsets.only(top: 2),
      padding: EdgeInsets.symmetric(horizontal: tokens.xs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: _fillAlpha),
        borderRadius: BorderRadius.circular(tokens.radius / 2),
        border: Border(left: BorderSide(color: color, width: 2)),
      ),
      child: Text(
        entry.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.fg),
      ),
    );
  }
}
