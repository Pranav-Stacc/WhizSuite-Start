import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/menu_filter_chip.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/calendar_controller.dart';
import '../domain/calendar_entry.dart';
import 'calendar_agenda.dart';
import 'calendar_entry_sheet.dart';
import 'calendar_form.dart';
import 'calendar_source.dart';
import 'month_grid.dart';

enum _CalendarMode { month, upcoming }

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  static const _roomyBreakpoint = 720.0;
  static const _maxContentWidth = 1100.0;

  late DateTime _month = monthOf(DateTime.now());
  late DateTime _selected = dayOf(DateTime.now());
  _CalendarMode _mode = _CalendarMode.month;
  CalendarFilter _filter = const CalendarFilter();

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showCalendarItemForm(context, ref, day: _selected);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _refresh() async {
    ref.invalidate(calendarFeedProvider);
    await ref.read(calendarFeedProvider.future);
  }

  void _selectDay(DateTime day) => setState(() {
        _selected = day;
        _month = monthOf(day);
      });

  void _shiftMonth(int delta) => setState(() {
        _month = addMonths(_month, delta);
        if (_selected.month != _month.month || _selected.year != _month.year) {
          _selected = _month;
        }
      });

  void _goToday() {
    final today = dayOf(DateTime.now());
    setState(() {
      _selected = today;
      _month = monthOf(today);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(calendarFeedProvider);
    final createButton = PermissionGate(
      anyOf: const [Permissions.projectsCreate],
      child: CreateFab(label: l10n.calendarNew, onPressed: _create),
    );

    return PageScaffold(
      title: l10n.calendarTitle,
      floatingActionButton: createButton,
      body: AsyncValueView<CalendarFeed>(
        value: feed,
        onRetry: () => ref.invalidate(calendarFeedProvider),
        data: (data) => _CalendarBody(
          feed: data,
          month: _month,
          selected: _selected,
          mode: _mode,
          filter: _filter,
          onRefresh: _refresh,
          onMode: (mode) => setState(() => _mode = mode),
          onFilter: (filter) => setState(() => _filter = filter),
          onSelectDay: _selectDay,
          onShiftMonth: _shiftMonth,
          onToday: _goToday,
          onOpen: (entry) => showCalendarEntrySheet(context, entry),
          onCreate: _create,
        ),
      ),
    );
  }
}

class _CalendarBody extends ConsumerWidget {
  const _CalendarBody({
    required this.feed,
    required this.month,
    required this.selected,
    required this.mode,
    required this.filter,
    required this.onRefresh,
    required this.onMode,
    required this.onFilter,
    required this.onSelectDay,
    required this.onShiftMonth,
    required this.onToday,
    required this.onOpen,
    required this.onCreate,
  });

  final CalendarFeed feed;
  final DateTime month;
  final DateTime selected;
  final _CalendarMode mode;
  final CalendarFilter filter;
  final Future<void> Function() onRefresh;
  final ValueChanged<_CalendarMode> onMode;
  final ValueChanged<CalendarFilter> onFilter;
  final ValueChanged<DateTime> onSelectDay;
  final ValueChanged<int> onShiftMonth;
  final VoidCallback onToday;
  final ValueChanged<CalendarEntry> onOpen;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final filtered = feed.entries.where(filter.matches).toList();
    final byDay = entriesByDay(filtered);
    final dayEntries = byDay[selected] ?? const <CalendarEntry>[];
    final upcoming = upcomingDays(byDay, now: DateTime.now());
    final today = dayOf(DateTime.now());
    final clientIds = {
      for (final entry in feed.entries)
        if (entry.clientId != null && clients[entry.clientId!] != null) entry.clientId!,
    }.toList()
      ..sort((a, b) => (clients.nameOf(a) ?? '').compareTo(clients.nameOf(b) ?? ''));

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final gutter = (constraints.maxWidth - _CalendarScreenState._maxContentWidth).clamp(0, double.infinity) / 2;
          final pad = EdgeInsets.fromLTRB(
            tokens.lg + gutter,
            tokens.lg,
            tokens.lg + gutter,
            tokens.xxl * 2,
          );
          final roomy = constraints.maxWidth >= _CalendarScreenState._roomyBreakpoint;

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: pad,
            children: [
              FadeSlideIn(
                child: SegmentedButton<_CalendarMode>(
                  segments: [
                    ButtonSegment(
                      value: _CalendarMode.month,
                      label: Text(l10n.calendarModeMonth),
                      icon: const Icon(Icons.calendar_view_month_outlined),
                    ),
                    ButtonSegment(
                      value: _CalendarMode.upcoming,
                      label: Text(l10n.calendarModeUpcoming),
                      icon: const Icon(Icons.view_agenda_outlined),
                    ),
                  ],
                  selected: {mode},
                  onSelectionChanged: (value) => onMode(value.first),
                ),
              ),
              SizedBox(height: tokens.md),
              FadeSlideIn(
                index: 1,
                child: _FilterRow(
                  filter: filter,
                  clientIds: clientIds,
                  clients: clients,
                  onFilter: onFilter,
                ),
              ),
              if (feed.partial) ...[
                SizedBox(height: tokens.md),
                FadeSlideIn(
                  index: 2,
                  child: SurfaceCard(
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: tokens.secondary),
                        SizedBox(width: tokens.sm),
                        Expanded(
                          child: Text(
                            l10n.calendarPartialSources,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              SizedBox(height: tokens.lg),
              if (mode == _CalendarMode.month) ...[
                FadeSlideIn(
                  index: 3,
                  child: _MonthHeader(
                    month: month,
                    isCurrentMonth: month == monthOf(today),
                    onPrevious: () => onShiftMonth(-1),
                    onNext: () => onShiftMonth(1),
                    onToday: onToday,
                  ),
                ),
                SizedBox(height: tokens.sm),
                FadeSlideIn(
                  index: 4,
                  child: MonthGrid(
                    month: month,
                    selected: selected,
                    byDay: byDay,
                    onSelect: onSelectDay,
                    roomy: roomy,
                  ),
                ),
                SizedBox(height: tokens.xl),
                FadeSlideIn(
                  index: 5,
                  child: SectionHeader(
                    title: formats.date(selected),
                    trailing: Text(
                      l10n.calendarDayCount(dayEntries.length),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                    ),
                  ),
                ),
                if (dayEntries.isEmpty)
                  SurfaceCard(
                    child: Row(
                      children: [
                        Icon(Icons.event_available_outlined, color: tokens.muted),
                        SizedBox(width: tokens.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l10n.calendarDayEmpty, style: Theme.of(context).textTheme.titleSmall),
                              Text(
                                l10n.calendarDayEmptyBody,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                              ),
                            ],
                          ),
                        ),
                        PermissionGate(
                          anyOf: const [Permissions.projectsCreate],
                          child: TextButton.icon(
                            onPressed: onCreate,
                            icon: const Icon(Icons.add, size: 18),
                            label: Text(l10n.calendarNew),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  DayAgenda(day: selected, entries: dayEntries, onOpen: onOpen),
              ] else if (upcoming.isEmpty)
                EmptyState(
                  icon: Icons.event_busy_outlined,
                  title: filter.isActive ? l10n.calendarNoMatches : l10n.calendarUpcomingEmpty,
                  body: filter.isActive ? null : l10n.calendarUpcomingEmptyBody,
                  action: filter.isActive
                      ? TextButton(onPressed: () => onFilter(const CalendarFilter()), child: Text(l10n.calendarFiltersClear))
                      : PermissionGate(
                          anyOf: const [Permissions.projectsCreate],
                          child: FilledButton.icon(
                            onPressed: onCreate,
                            icon: const Icon(Icons.add),
                            label: Text(l10n.calendarNew),
                          ),
                        ),
                )
              else
                for (final (index, (day, entries)) in upcoming.indexed) ...[
                  if (index > 0) SizedBox(height: tokens.lg),
                  FadeSlideIn(
                    index: index,
                    child: SectionHeader(
                      title: day == today ? l10n.calendarToday : formats.weekday(day),
                      trailing: Text(
                        formats.shortDate(day),
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                      ),
                    ),
                  ),
                  DayAgenda(day: day, entries: entries, onOpen: onOpen),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _MonthHeader extends StatelessWidget {
  const _MonthHeader({
    required this.month,
    required this.isCurrentMonth,
    required this.onPrevious,
    required this.onNext,
    required this.onToday,
  });

  final DateTime month;
  final bool isCurrentMonth;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToday;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final title = DateFormat.yMMMM(locale).format(month);

    return Row(
      children: [
        IconButton(
          tooltip: l10n.calendarPreviousMonth,
          onPressed: onPrevious,
          icon: const Icon(Icons.chevron_left),
        ),
        IconButton(
          tooltip: l10n.calendarNextMonth,
          onPressed: onNext,
          icon: const Icon(Icons.chevron_right),
        ),
        if (!isCurrentMonth)
          TextButton(onPressed: onToday, child: Text(l10n.calendarToday)),
        Expanded(
          child: Text(
            title,
            textAlign: TextAlign.end,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
      ],
    );
  }
}

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.filter,
    required this.clientIds,
    required this.clients,
    required this.onFilter,
  });

  final CalendarFilter filter;
  final List<String> clientIds;
  final Directory clients;
  final ValueChanged<CalendarFilter> onFilter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          if (clientIds.isNotEmpty) ...[
            MenuFilterChip<String>(
              label: l10n.calendarFilterClient,
              icon: Icons.business_outlined,
              options: clientIds,
              selected: filter.clientId,
              labelOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
              onSelected: (id) => onFilter(CalendarFilter(clientId: id, sourceType: filter.sourceType)),
            ),
            SizedBox(width: tokens.sm),
          ],
          MenuFilterChip<String>(
            label: l10n.calendarFilterType,
            icon: Icons.category_outlined,
            options: CalendarSourceTypes.values,
            selected: filter.sourceType,
            labelOf: (type) => calendarSourceLabel(l10n, type),
            onSelected: (type) => onFilter(CalendarFilter(clientId: filter.clientId, sourceType: type)),
          ),
          if (filter.isActive) ...[
            SizedBox(width: tokens.sm),
            TextButton(
              onPressed: () => onFilter(const CalendarFilter()),
              child: Text(l10n.calendarFiltersClear),
            ),
          ],
        ],
      ),
    );
  }
}
