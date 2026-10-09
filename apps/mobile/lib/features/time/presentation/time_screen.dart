import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../auth/application/session_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/time_controller.dart';
import '../domain/time_entry.dart';
import '../domain/time_week.dart';
import 'log_time_form.dart';
import 'time_entry_row.dart';
import 'timer_card.dart';
import 'week_summary_card.dart';

enum _Scope { mine, team }

class TimeScreen extends ConsumerStatefulWidget {
  const TimeScreen({super.key});

  @override
  ConsumerState<TimeScreen> createState() => _TimeScreenState();
}

class _TimeScreenState extends ConsumerState<TimeScreen> {
  /// Timer and week summary sit side by side from this width.
  static const _wideBreakpoint = 840.0;
  static const _maxContentWidth = 1100.0;

  DateTime _week = weekStartOf(DateTime.now());
  _Scope _scope = _Scope.mine;

  DateTime get _currentWeek => weekStartOf(DateTime.now());

  void _shiftWeek(int weeks) =>
      setState(() => _week = DateTime(_week.year, _week.month, _week.day + weeks * DateTime.daysPerWeek));

  Future<void> _log() async {
    final l10n = AppLocalizations.of(context);
    final today = DateUtils.dateOnly(DateTime.now());
    final inWeekShown = !today.isBefore(_week) && calendarDaysBetween(_week, today) < DateTime.daysPerWeek;
    final saved = await showLogTimeForm(context, ref, initialDate: inWeekShown ? today : _week);
    if (saved && mounted) showToast(context, l10n.timeLogged);
  }

  Future<void> _refresh() async {
    ref
      ..invalidate(runningTimerProvider)
      ..invalidate(timeEntriesProvider);
    await ref.read(timeEntriesProvider.future);
  }

  Future<void> _delete(TimeEntry entry) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await confirmAction(
      context,
      title: l10n.timeDeleteTitle,
      body: l10n.deleteConfirmBody,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    await runAction(context, () => ref.read(timeActionsProvider).delete(entry.id), success: l10n.deletedToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final entries = ref.watch(timeEntriesProvider);
    final userId = ref.watch(sessionProvider.select((s) => s.value?.userId));
    final isLeader = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.membersEdit)));
    final team = isLeader && _scope == _Scope.team;
    final scoped = (entries.value ?? const <TimeEntry>[]).where((e) => team || e.userId == userId).toList();
    final summary = WeekSummary.of(scoped, _week);
    final groups = groupByDay(scoped.where((e) => inWeek(e, _week)));
    final isCurrentWeek = _week == _currentWeek;

    final logButton = PermissionGate(
      anyOf: const [Permissions.timeTrack],
      child: CreateFab(label: l10n.timeLog, icon: Icons.more_time, onPressed: _log),
    );

    return PageScaffold(
      title: l10n.timeTitle,
      floatingActionButton: logButton,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final gutter = math.max(tokens.lg, (constraints.maxWidth - _maxContentWidth) / 2);
            final wide = constraints.maxWidth >= _wideBreakpoint;
            final weekCard = WeekSummaryCard(
              summary: summary,
              onPrevious: () => _shiftWeek(-1),
              onNext: isCurrentWeek ? null : () => _shiftWeek(1),
              onToday: isCurrentWeek ? null : () => setState(() => _week = _currentWeek),
            );
            final top = wide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Expanded(child: TimerCard()),
                      SizedBox(width: tokens.lg),
                      Expanded(child: weekCard),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const TimerCard(),
                      SizedBox(height: tokens.lg),
                      weekCard,
                    ],
                  );

            return CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(gutter, tokens.lg, gutter, tokens.lg),
                  sliver: SliverToBoxAdapter(child: FadeSlideIn(child: top)),
                ),
                SliverPadding(
                  padding: EdgeInsets.symmetric(horizontal: gutter),
                  sliver: SliverToBoxAdapter(
                    child: FadeSlideIn(
                      index: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (isLeader) ...[
                            SegmentedButton<_Scope>(
                              segments: [
                                ButtonSegment(
                                  value: _Scope.mine,
                                  label: Text(l10n.timeScopeMine),
                                  icon: const Icon(Icons.person_outline),
                                ),
                                ButtonSegment(
                                  value: _Scope.team,
                                  label: Text(l10n.timeScopeTeam),
                                  icon: const Icon(Icons.groups_outlined),
                                ),
                              ],
                              selected: {_scope},
                              onSelectionChanged: (s) => setState(() => _scope = s.first),
                            ),
                            SizedBox(height: tokens.lg),
                          ],
                          SectionHeader(
                            title: l10n.timeEntries,
                            trailing: Text(
                              l10n.timeEntryCount(groups.fold(0, (n, g) => n + g.entries.length)),
                              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tokens.muted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                ..._entrySlivers(
                  context,
                  entries,
                  groups,
                  gutter: gutter,
                  team: team,
                  userId: userId,
                  isLeader: isLeader,
                ),
                SliverToBoxAdapter(child: SizedBox(height: tokens.xxl * 2)),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _entrySlivers(
    BuildContext context,
    AsyncValue<List<TimeEntry>> entries,
    List<DayGroup> groups, {
    required double gutter,
    required bool team,
    required String? userId,
    required bool isLeader,
  }) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final padding = EdgeInsets.symmetric(horizontal: gutter);

    if (!entries.hasValue) {
      final error = entries.error;
      if (error != null) {
        return [
          SliverToBoxAdapter(
            child: ErrorState(error: error, onRetry: () => ref.invalidate(timeEntriesProvider)),
          ),
        ];
      }
      return [
        SliverPadding(
          padding: padding,
          sliver: const SliverToBoxAdapter(child: SizedBox(height: 320, child: SkeletonList(itemCount: 4))),
        ),
      ];
    }
    if (groups.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: EmptyState(
            icon: Icons.timer_outlined,
            title: l10n.timeEntriesEmpty,
            body: l10n.timeEntriesEmptyBody,
            action: PermissionGate(
              anyOf: const [Permissions.timeTrack],
              child: FilledButton.icon(onPressed: _log, icon: const Icon(Icons.more_time), label: Text(l10n.timeLog)),
            ),
          ),
        ),
      ];
    }

    final projects = ref.watch(projectDirectoryProvider).value ?? Directory.empty;
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final tasks = {for (final t in ref.watch(timeTasksProvider).value ?? const <TaskOption>[]) t.id: t.title};

    return [
      for (final (index, group) in groups.indexed)
        SliverMainAxisGroup(
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _DayHeader(group: group, background: tokens.bg),
            ),
            SliverPadding(
              padding: padding.copyWith(bottom: tokens.lg),
              sliver: SliverToBoxAdapter(
                child: FadeSlideIn(
                  index: index,
                  child: SurfaceCard(
                    padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.xs),
                    child: Column(
                      children: [
                        for (final (i, entry) in group.entries.indexed) ...[
                          if (i > 0) const Divider(height: 1),
                          TimeEntryRow(
                            entry: entry,
                            projectName: projects.nameOf(entry.projectId),
                            clientName: clients.nameOf(entry.clientId),
                            taskTitle: tasks[entry.taskId],
                            personName: team ? members.nameOf(entry.userId) : null,
                            onDelete: isLeader || (userId != null && entry.userId == userId)
                                ? () => _delete(entry)
                                : null,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
    ];
  }
}

/// Pinned day label with the day's total; stays visible while scrolling that day's entries.
class _DayHeader extends SliverPersistentHeaderDelegate {
  _DayHeader({required this.group, required this.background});

  static const _height = 48.0;

  final DayGroup group;
  final Color background;

  @override
  double get minExtent => _height;

  @override
  double get maxExtent => _height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final today = DateUtils.dateOnly(DateTime.now());
    final days = calendarDaysBetween(group.day, today);
    final name = days == 0
        ? l10n.timeToday
        : days == 1
        ? l10n.timeYesterday
        : formats.weekday(group.day);
    final total = formats.duration(group.minutes);
    return Semantics(
      header: true,
      label: l10n.timeDaySemantics(name, formats.date(group.day), total),
      excludeSemantics: true,
      child: Container(
        color: background,
        alignment: AlignmentDirectional.centerStart,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final gutter = math.max(tokens.lg, (constraints.maxWidth - _TimeScreenState._maxContentWidth) / 2);
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: gutter),
              child: Row(
                children: [
                  Text(name, style: text.titleSmall),
                  SizedBox(width: tokens.sm),
                  Text(formats.shortDate(group.day), style: text.bodySmall?.copyWith(color: tokens.muted)),
                  const Spacer(),
                  Text(total, style: text.labelLarge?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(_DayHeader oldDelegate) =>
      oldDelegate.group.minutes != group.minutes ||
      oldDelegate.group.day != group.day ||
      oldDelegate.background != background;
}
