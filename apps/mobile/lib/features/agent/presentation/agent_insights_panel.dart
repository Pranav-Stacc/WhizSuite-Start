import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../calendar/calendar_routes.dart';
import '../../dashboard/application/dashboard_providers.dart';
import '../../dashboard/domain/dashboard_summaries.dart';
import '../application/agent_providers.dart';
import '../domain/agent_models.dart';

/// Completed tool run shown in the Whiz insights drawer.
class AgentToolOutcome {
  const AgentToolOutcome({
    required this.toolId,
    required this.ok,
    this.summary,
    required this.at,
  });

  final String toolId;
  final bool ok;
  final String? summary;
  final DateTime at;
}

/// Right-hand drawer: upcoming schedule + agent schedules + tools completed this session.
class AgentInsightsPanel extends ConsumerWidget {
  const AgentInsightsPanel({required this.outcomes, super.key});

  final List<AgentToolOutcome> outcomes;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final policy = ref.watch(accessPolicyProvider);
    final upcoming = policy.canAny(const [Permissions.calendarView, Permissions.contentView, Permissions.projectsView])
        ? ref.watch(upcomingProvider)
        : const AsyncValue<List<UpcomingItem>>.data([]);
    final schedules = policy.can(Permissions.aiChat) ? ref.watch(agentSchedulesProvider) : const AsyncValue.data(<AgentSchedule>[]);

    return Material(
      color: tokens.bg,
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.xxl),
          children: [
            Text(l10n.agentInsightsTitle, style: text.titleLarge),
            SizedBox(height: tokens.xs),
            Text(l10n.agentInsightsSubtitle, style: text.bodySmall?.copyWith(color: tokens.muted)),
            SizedBox(height: tokens.lg),
            SectionHeader(title: l10n.agentInsightsUpcoming),
            SizedBox(height: tokens.sm),
            switch (upcoming) {
              AsyncValue(value: final items?) when items.isEmpty => Text(
                  l10n.agentInsightsUpcomingEmpty,
                  style: text.bodyMedium?.copyWith(color: tokens.muted),
                ),
              AsyncValue(value: final items?) => Column(
                  children: [
                    for (final (i, item) in items.take(8).indexed) ...[
                      if (i > 0) SizedBox(height: tokens.sm),
                      _UpcomingTile(item: item),
                    ],
                  ],
                ),
              AsyncValue(hasError: true) => ErrorState(
                  error: upcoming.error ?? const Object(),
                  onRetry: () {
                    ref
                      ..invalidate(dashboardCalendarProvider)
                      ..invalidate(dashboardContentProvider);
                  },
                ),
              _ => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                ),
            },
            SizedBox(height: tokens.lg),
            SectionHeader(title: l10n.agentInsightsSchedules),
            SizedBox(height: tokens.sm),
            switch (schedules) {
              AsyncValue(value: final rows?) when rows.isEmpty => Text(
                  l10n.agentInsightsSchedulesEmpty,
                  style: text.bodyMedium?.copyWith(color: tokens.muted),
                ),
              AsyncValue(value: final rows?) => Column(
                  children: [
                    for (final row in rows.take(6))
                      Padding(
                        padding: EdgeInsets.only(bottom: tokens.sm),
                        child: SurfaceCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(row.prompt, style: text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                              SizedBox(height: tokens.xs),
                              Text(
                                '${row.cronExpression} · ${row.status}',
                                style: text.labelSmall?.copyWith(color: tokens.muted),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              _ => const SizedBox.shrink(),
            },
            SizedBox(height: tokens.lg),
            SectionHeader(title: l10n.agentInsightsCompleted),
            SizedBox(height: tokens.sm),
            if (outcomes.isEmpty)
              Text(l10n.agentInsightsCompletedEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
            else
              Column(
                children: [
                  for (final outcome in outcomes.reversed.take(12))
                    Padding(
                      padding: EdgeInsets.only(bottom: tokens.sm),
                      child: SurfaceCard(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              outcome.ok ? Icons.check_circle_outline : Icons.error_outline,
                              size: 20,
                              color: outcome.ok ? tokens.secondary : Theme.of(context).colorScheme.error,
                            ),
                            SizedBox(width: tokens.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(outcome.toolId, style: text.labelMedium),
                                  if (outcome.summary != null && outcome.summary!.isNotEmpty)
                                    Text(outcome.summary!, style: text.bodySmall),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            SizedBox(height: tokens.md),
            TextButton.icon(
              onPressed: () => context.push(CalendarRoutes.root),
              icon: const Icon(Icons.calendar_month_outlined),
              label: Text(l10n.agentInsightsOpenCalendar),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingTile extends StatelessWidget {
  const _UpcomingTile({required this.item});

  final UpcomingItem item;

  @override
  Widget build(BuildContext context) {
    final formats = context.formats;
    final l10n = AppLocalizations.of(context);
    final when = item.allDay ? l10n.dashboardAllDay : formats.dateTime(item.at);
    return SurfaceCard(
      onTap: () => context.push(CalendarRoutes.root),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.title, style: Theme.of(context).textTheme.titleSmall),
                Text(when, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
