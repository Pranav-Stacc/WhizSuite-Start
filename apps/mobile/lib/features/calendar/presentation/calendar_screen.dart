import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../content/application/content_controller.dart';
import '../../content/content_routes.dart';
import '../../content/domain/content.dart';
import '../../content/presentation/content_sheet.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/calendar_controller.dart';
import '../domain/calendar_entry.dart';
import 'calendar_agenda.dart';
import 'calendar_entry_sheet.dart';
import 'calendar_filter_sheet.dart';
import 'calendar_form.dart';
import 'calendar_source.dart';
import 'month_grid.dart';
import 'plan_shoot_sheet.dart';

enum _CalendarMode { month, sheet, upcoming }

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key, this.initialClientId});

  final String? initialClientId;

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  static const _splitBreakpoint = 840.0;
  static const _maxContentWidth = 1200.0;

  late DateTime _month = monthOf(DateTime.now());
  late DateTime _selected = dayOf(DateTime.now());
  _CalendarMode _mode = _CalendarMode.month;
  bool _hideEmptyDays = false;
  late CalendarFilter _filter = CalendarFilter(
    clientId: widget.initialClientId != null && widget.initialClientId!.isNotEmpty
        ? widget.initialClientId
        : null,
  );

  Future<void> _createEvent() async {
    final l10n = AppLocalizations.of(context);
    final created = await showCalendarItemForm(context, ref, day: _selected);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _planShoot() async {
    final l10n = AppLocalizations.of(context);
    final created = await showPlanShootSheet(
      context,
      ref,
      day: _selected,
      clientId: _filter.clientId,
    );
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  Future<void> _pickCreateAction() async {
    final l10n = AppLocalizations.of(context);
    final choice = await showModalBottomSheet<_CreateChoice>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.event_outlined),
              title: Text(l10n.calendarNew),
              subtitle: Text(l10n.calendarNewEventHint),
              onTap: () => Navigator.pop(context, _CreateChoice.event),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: Text(l10n.calendarPlanShoot),
              subtitle: Text(l10n.calendarPlanShootHint),
              onTap: () => Navigator.pop(context, _CreateChoice.shoot),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    switch (choice) {
      case _CreateChoice.event:
        await _createEvent();
      case _CreateChoice.shoot:
        await _planShoot();
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncFeedMonth());
  }

  Future<void> _refresh() async {
    ref.invalidate(calendarFeedProvider);
    await ref.read(calendarFeedProvider.future);
  }

  void _syncFeedMonth() {
    ref.read(calendarVisibleMonthProvider.notifier).set(monthOf(_month));
  }

  void _selectDay(DateTime day) => setState(() {
        _selected = day;
        _month = monthOf(day);
        _syncFeedMonth();
      });

  void _shiftMonth(int delta) => setState(() {
        _month = addMonths(_month, delta);
        if (_selected.month != _month.month || _selected.year != _month.year) {
          _selected = _month;
        }
        _syncFeedMonth();
      });

  void _goToday() {
    final today = dayOf(DateTime.now());
    setState(() {
      _selected = today;
      _month = monthOf(today);
      _syncFeedMonth();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(calendarFeedProvider);
    final createButton = PermissionGate(
      anyOf: const [Permissions.projectsCreate],
      child: CreateFab(label: l10n.calendarCreate, onPressed: _pickCreateAction),
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
          hideEmptyDays: _hideEmptyDays,
          onRefresh: _refresh,
          onMode: (mode) => setState(() => _mode = mode),
          onFilter: (filter) => setState(() => _filter = filter),
          onToggleEmptyDays: () => setState(() => _hideEmptyDays = !_hideEmptyDays),
          onSelectDay: _selectDay,
          onShiftMonth: _shiftMonth,
          onToday: _goToday,
          onOpen: (entry) => showCalendarEntrySheet(context, entry),
          onCreate: _pickCreateAction,
        ),
      ),
    );
  }
}

enum _CreateChoice { event, shoot }

class _CalendarBody extends ConsumerWidget {
  const _CalendarBody({
    required this.feed,
    required this.month,
    required this.selected,
    required this.mode,
    required this.filter,
    required this.hideEmptyDays,
    required this.onRefresh,
    required this.onMode,
    required this.onFilter,
    required this.onToggleEmptyDays,
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
  final bool hideEmptyDays;
  final Future<void> Function() onRefresh;
  final ValueChanged<_CalendarMode> onMode;
  final ValueChanged<CalendarFilter> onFilter;
  final VoidCallback onToggleEmptyDays;
  final ValueChanged<DateTime> onSelectDay;
  final ValueChanged<int> onShiftMonth;
  final VoidCallback onToday;
  final ValueChanged<CalendarEntry> onOpen;
  final VoidCallback onCreate;

  Future<void> _openFilters(BuildContext context, List<String> clientIds, Directory clients) async {
    final l10n = AppLocalizations.of(context);
    final next = await showCalendarFilterSheet(
      context,
      initial: filter,
      clientIds: clientIds,
      clientNameOf: (id) => clients.nameOf(id) ?? l10n.valueUnknown,
    );
    if (next != null) onFilter(next);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final contentItems = ref.watch(contentListProvider).value ?? const <Content>[];
    final filtered = feed.entries.where(filter.matches).toList();
    final scheduledContent = contentItems.where((post) {
      if (post.scheduledAt == null) return false;
      if (filter.clientId != null && post.clientId != filter.clientId) return false;
      final local = post.scheduledAt!.toLocal();
      return local.year == month.year && local.month == month.month;
    }).toList();
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
          final split = constraints.maxWidth >= _CalendarScreenState._splitBreakpoint;
          final roomy = constraints.maxWidth >= 720;

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: pad,
            children: [
              FadeSlideIn(
                child: _CalendarToolbar(
                  mode: mode,
                  filter: filter,
                  onMode: onMode,
                  onFilter: () => _openFilters(context, clientIds, clients),
                ),
              ),
              if (feed.partial) ...[
                SizedBox(height: tokens.md),
                FadeSlideIn(
                  index: 1,
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
              switch (mode) {
                _CalendarMode.month => FadeSlideIn(
                    index: 2,
                    child: split
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 5,
                                child: _MonthPanel(
                                  month: month,
                                  selected: selected,
                                  today: today,
                                  byDay: byDay,
                                  roomy: true,
                                  onPrevious: () => onShiftMonth(-1),
                                  onNext: () => onShiftMonth(1),
                                  onToday: onToday,
                                  onSelect: onSelectDay,
                                ),
                              ),
                              SizedBox(width: tokens.lg),
                              Expanded(
                                flex: 4,
                                child: _DayAgendaPanel(
                                  selected: selected,
                                  entries: dayEntries,
                                  formats: formats,
                                  onCreate: onCreate,
                                  onOpen: onOpen,
                                ),
                              ),
                            ],
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _MonthPanel(
                                month: month,
                                selected: selected,
                                today: today,
                                byDay: byDay,
                                roomy: split || roomy,
                                onPrevious: () => onShiftMonth(-1),
                                onNext: () => onShiftMonth(1),
                                onToday: onToday,
                                onSelect: onSelectDay,
                              ),
                              SizedBox(height: tokens.lg),
                              _DayAgendaPanel(
                                selected: selected,
                                entries: dayEntries,
                                formats: formats,
                                onCreate: onCreate,
                                onOpen: onOpen,
                              ),
                            ],
                          ),
                  ),
                _CalendarMode.sheet => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FadeSlideIn(
                        index: 2,
                        child: _MonthHeader(
                          month: month,
                          isCurrentMonth: month == monthOf(today),
                          onPrevious: () => onShiftMonth(-1),
                          onNext: () => onShiftMonth(1),
                          onToday: onToday,
                          trailing: FilterChip(
                            label: Text(l10n.contentSheetHideEmpty),
                            selected: hideEmptyDays,
                            showCheckmark: false,
                            onSelected: (_) => onToggleEmptyDays(),
                          ),
                        ),
                      ),
                      SizedBox(height: tokens.md),
                      FadeSlideIn(
                        index: 3,
                        child: ContentSheet(
                          columns: ContentSheet.columnsForMonth(
                            month: month,
                            posts: scheduledContent,
                            hideEmptyDays: hideEmptyDays,
                          ),
                          onNewPost: (scheduledAt) => context.push(
                            ContentRoutes.compose(clientId: filter.clientId, scheduledAt: scheduledAt),
                          ),
                          onPostTap: (post) => context.push(ContentRoutes.detail(post.id)),
                        ),
                      ),
                    ],
                  ),
                _CalendarMode.upcoming => upcoming.isEmpty
                    ? EmptyState(
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
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
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
                      ),
              },
            ],
          );
        },
      ),
    );
  }
}

class _CalendarToolbar extends StatelessWidget {
  const _CalendarToolbar({
    required this.mode,
    required this.filter,
    required this.onMode,
    required this.onFilter,
  });

  static const _compactBreakpoint = 640.0;

  final _CalendarMode mode;
  final CalendarFilter filter;
  final ValueChanged<_CalendarMode> onMode;
  final VoidCallback onFilter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < _compactBreakpoint;
        return Row(
          children: [
            Expanded(
              child: SegmentedButton<_CalendarMode>(
                showSelectedIcon: false,
                style: compact
                    ? ButtonStyle(
                        visualDensity: VisualDensity.compact,
                        padding: WidgetStateProperty.all(EdgeInsets.symmetric(horizontal: tokens.sm)),
                      )
                    : null,
                segments: [
                  ButtonSegment(
                    value: _CalendarMode.month,
                    icon: const Icon(Icons.calendar_view_month_outlined),
                    label: compact
                        ? null
                        : Text(l10n.calendarModeMonth, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false),
                    tooltip: l10n.calendarModeMonth,
                  ),
                  ButtonSegment(
                    value: _CalendarMode.sheet,
                    icon: const Icon(Icons.table_rows_outlined),
                    label: compact
                        ? null
                        : Text(l10n.calendarModeSheet, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false),
                    tooltip: l10n.calendarModeSheet,
                  ),
                  ButtonSegment(
                    value: _CalendarMode.upcoming,
                    icon: const Icon(Icons.view_agenda_outlined),
                    label: compact
                        ? null
                        : Text(l10n.calendarModeUpcoming, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false),
                    tooltip: l10n.calendarModeUpcoming,
                  ),
                ],
                selected: {mode},
                onSelectionChanged: (value) => onMode(value.first),
              ),
            ),
            SizedBox(width: tokens.sm),
            IconButton(
              tooltip: l10n.calendarFilters,
              onPressed: onFilter,
              icon: Badge(
                isLabelVisible: filter.isActive,
                label: const Text('1'),
                child: Icon(filter.isActive ? Icons.filter_alt : Icons.filter_alt_outlined),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MonthPanel extends StatelessWidget {
  const _MonthPanel({
    required this.month,
    required this.selected,
    required this.today,
    required this.byDay,
    required this.roomy,
    required this.onPrevious,
    required this.onNext,
    required this.onToday,
    required this.onSelect,
  });

  final DateTime month;
  final DateTime selected;
  final DateTime today;
  final Map<DateTime, List<CalendarEntry>> byDay;
  final bool roomy;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToday;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return SurfaceCard(
      padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _MonthHeader(
            month: month,
            isCurrentMonth: month == monthOf(today),
            onPrevious: onPrevious,
            onNext: onNext,
            onToday: onToday,
          ),
          SizedBox(height: tokens.sm),
          MonthGrid(
            month: month,
            selected: selected,
            byDay: byDay,
            onSelect: onSelect,
            roomy: roomy,
          ),
          SizedBox(height: tokens.md),
          _SourceLegend(),
        ],
      ),
    );
  }
}

class _DayAgendaPanel extends StatelessWidget {
  const _DayAgendaPanel({
    required this.selected,
    required this.entries,
    required this.formats,
    required this.onCreate,
    required this.onOpen,
  });

  final DateTime selected;
  final List<CalendarEntry> entries;
  final AppFormats formats;
  final VoidCallback onCreate;
  final ValueChanged<CalendarEntry> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.calendarDayAgenda, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted)),
                    SizedBox(height: tokens.xs),
                    Text(formats.date(selected), style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
              ),
              Text(
                l10n.calendarDayCount(entries.length),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          if (entries.isEmpty)
            Row(
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
            )
          else
            DayAgenda(day: selected, entries: entries, onOpen: onOpen),
        ],
      ),
    );
  }
}

class _SourceLegend extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Wrap(
      spacing: tokens.md,
      runSpacing: tokens.sm,
      children: [
        for (final type in CalendarSourceTypes.values)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: calendarSourceTone(type).color(tokens), shape: BoxShape.circle),
              ),
              SizedBox(width: tokens.xs),
              Text(calendarSourceLabel(l10n, type), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
            ],
          ),
      ],
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
    this.trailing,
  });

  final DateTime month;
  final bool isCurrentMonth;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToday;
  final Widget? trailing;

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
        Expanded(
          child: Column(
            children: [
              Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
              if (!isCurrentMonth)
                TextButton(onPressed: onToday, child: Text(l10n.calendarToday)),
            ],
          ),
        ),
        IconButton(
          tooltip: l10n.calendarNextMonth,
          onPressed: onNext,
          icon: const Icon(Icons.chevron_right),
        ),
        ?trailing,
      ],
    );
  }
}
