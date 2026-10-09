import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/audit_controller.dart';
import '../domain/audit_entry.dart';
import '../domain/audit_filter.dart';
import 'audit_detail_sheet.dart';
import 'audit_filter_sheet.dart';
import 'audit_labels.dart';
import 'audit_row.dart';

class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

/// A day heading or an audit record in the flattened list.
sealed class _Item {}

class _DayItem extends _Item {
  _DayItem(this.day);
  final DateTime day;
}

class _EntryItem extends _Item {
  _EntryItem(this.entry);
  final AuditEntry entry;
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  /// Distance from the end of the list at which the next page starts loading.
  static const _loadMoreExtent = 600.0;

  AuditFilter _filter = const AuditFilter();

  bool _onScroll(ScrollNotification notification) {
    if (notification.metrics.extentAfter < _loadMoreExtent) {
      final feed = ref.read(auditFeedProvider).value;
      if (feed != null && feed.hasMore && !feed.loadingMore && feed.loadMoreError == null) {
        ref.read(auditFeedProvider.notifier).loadMore();
      }
    }
    return false;
  }

  Future<void> _openFilters(AuditFeed feed, Directory members) async {
    final l10n = AppLocalizations.of(context);
    final next = await showAuditFilterSheet(
      context,
      initial: _filter,
      options: AuditFilterOptions.of(feed.entries),
      actorNameOf: (id) => members.nameOf(id) ?? l10n.auditUnknownActor,
    );
    if (next != null && mounted) setState(() => _filter = next);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final feed = ref.watch(auditFeedProvider);
    final members = ref.watch(memberDirectoryProvider).value ?? Directory.empty;
    final loaded = feed.value;

    return PageScaffold(
      title: l10n.auditTitle,
      actions: [
        if (loaded != null)
          IconButton(
            tooltip: l10n.auditFilters,
            onPressed: () => _openFilters(loaded, members),
            icon: Badge(
              isLabelVisible: _filter.activeCount > 0,
              label: Text('${_filter.activeCount}'),
              child: Icon(_filter.activeCount > 0 ? Icons.filter_alt : Icons.filter_alt_outlined),
            ),
          ),
      ],
      body: AsyncValueView<AuditFeed>(
        value: feed,
        onRetry: () => ref.invalidate(auditFeedProvider),
        isEmpty: (data) => data.entries.isEmpty,
        empty: RefreshIndicator(
          onRefresh: () => ref.refresh(auditFeedProvider.future),
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: constraints.maxHeight,
                child: EmptyState(icon: Icons.policy_outlined, title: l10n.auditEmpty, body: l10n.auditEmptyBody),
              ),
            ),
          ),
        ),
        data: (data) => _buildFeed(data, members),
      ),
    );
  }

  Widget _buildFeed(AuditFeed feed, Directory members) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final formats = context.formats;
    final visible = feed.entries
        .where((entry) => _filter.matches(entry, searchText: (e) => auditSearchText(l10n, e, members)))
        .toList();
    final failures = visible.where((entry) => entry.isFailure).length;
    final items = <_Item>[];
    DateTime? currentDay;
    for (final entry in visible) {
      final local = entry.createdAt.toLocal();
      final day = DateTime(local.year, local.month, local.day);
      if (day != currentDay) {
        items.add(_DayItem(day));
        currentDay = day;
      }
      items.add(_EntryItem(entry));
    }

    return NotificationListener<ScrollNotification>(
      onNotification: _onScroll,
      child: RefreshIndicator(
        onRefresh: () => ref.refresh(auditFeedProvider.future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
              sliver: SliverToBoxAdapter(
                child: _Readable(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l10n.auditSubtitle, style: TextStyle(color: tokens.muted)),
                      SizedBox(height: tokens.md),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final actors = {for (final e in visible) e.actorId}.length;
                          final tiles = [
                            MetricTile(
                              label: l10n.auditStatLoaded,
                              icon: Icons.history,
                              value: '${visible.length}',
                            ),
                            MetricTile(
                              label: l10n.auditStatFailures,
                              icon: Icons.error_outline,
                              value: '$failures',
                              tone: failures > 0 ? StatusTone.danger : StatusTone.neutral,
                            ),
                            MetricTile(
                              label: l10n.auditStatActors,
                              icon: Icons.people_outline,
                              value: '$actors',
                            ),
                          ];
                          final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                          final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                          return Wrap(
                            spacing: tokens.md,
                            runSpacing: tokens.md,
                            children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                          );
                        },
                      ),
                      SizedBox(height: tokens.md),
                      SearchField(
                        hint: l10n.auditSearch,
                        onChanged: (query) => setState(() => _filter = _filter.copyWith(query: query)),
                      ),
                      SizedBox(height: tokens.sm),
                      _FilterSummary(
                        filter: _filter,
                        members: members,
                        shown: visible.length,
                        failures: failures,
                        onClear: () => setState(() => _filter = _filter.cleared()),
                        onChanged: (next) => setState(() => _filter = next),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: Icons.search_off,
                  title: l10n.searchNoMatches,
                  body: feed.hasMore ? l10n.auditNoMatchesLoaded : l10n.searchNoMatchesBody,
                  action: feed.hasMore ? _LoadMoreButton(feed: feed) : null,
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: tokens.lg),
                sliver: SliverList.builder(
                  itemCount: items.length,
                  itemBuilder: (context, index) => _Readable(
                    child: switch (items[index]) {
                      _DayItem(:final day) => Padding(
                          padding: EdgeInsets.fromLTRB(tokens.xs, index == 0 ? 0 : tokens.lg, tokens.xs, tokens.sm),
                          child: Semantics(
                            header: true,
                            child: Text(
                              formats.date(day),
                              style: Theme.of(context).textTheme.labelLarge?.copyWith(color: tokens.secondary),
                            ),
                          ),
                        ),
                      _EntryItem(:final entry) => Padding(
                          padding: EdgeInsets.only(bottom: tokens.sm),
                          child: FadeSlideIn(
                            index: index,
                            child: AuditRow(
                              key: ValueKey(entry.id),
                              entry: entry,
                              actorName: auditActorName(l10n, entry, members),
                              onTap: () => showAuditDetailSheet(
                                context,
                                entry: entry,
                                actorName: auditActorName(l10n, entry, members),
                              ),
                            ),
                          ),
                        ),
                    },
                  ),
                ),
              ),
            if (items.isNotEmpty)
              SliverPadding(
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.xxl * 2),
                sliver: SliverToBoxAdapter(child: _Readable(child: _Footer(feed: feed))),
              ),
          ],
        ),
      ),
    );
  }
}

/// Active-filter chips with per-filter removal plus result counts.
class _FilterSummary extends StatelessWidget {
  const _FilterSummary({
    required this.filter,
    required this.members,
    required this.shown,
    required this.failures,
    required this.onClear,
    required this.onChanged,
  });

  final AuditFilter filter;
  final Directory members;
  final int shown;
  final int failures;
  final VoidCallback onClear;
  final ValueChanged<AuditFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final chips = <Widget>[
      if (filter.rangeDays case final days?)
        InputChip(
          label: Text(l10n.auditRangeDays(days)),
          onDeleted: () => onChanged(filter.copyWith(rangeDays: () => null)),
        ),
      if (filter.outcome case final outcome?)
        InputChip(
          label: Text(auditOutcomeLabel(l10n, outcome)),
          onDeleted: () => onChanged(filter.copyWith(outcome: () => null)),
        ),
      if (filter.actorId case final actorId?)
        InputChip(
          label: Text(members.nameOf(actorId) ?? l10n.auditUnknownActor),
          onDeleted: () => onChanged(filter.copyWith(actorId: () => null)),
        ),
      if (filter.actionDomain case final domain?)
        InputChip(
          label: Text(auditActionDomainLabel(l10n, domain)),
          onDeleted: () => onChanged(filter.copyWith(actionDomain: () => null)),
        ),
      if (filter.entityType case final type?)
        InputChip(
          label: Text(auditEntityTypeLabel(l10n, type)),
          onDeleted: () => onChanged(filter.copyWith(entityType: () => null)),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (chips.isNotEmpty)
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ...chips,
              TextButton(onPressed: onClear, child: Text(l10n.auditClearFilters)),
            ],
          ),
        Semantics(
          liveRegion: true,
          child: Text(
            l10n.auditResultCount(shown, failures),
            style: text.labelSmall?.copyWith(color: tokens.muted),
          ),
        ),
      ],
    );
  }
}

class _Footer extends ConsumerWidget {
  const _Footer({required this.feed});

  final AuditFeed feed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final error = feed.loadMoreError;
    if (feed.loadingMore) {
      return Center(
        child: Semantics(
          label: l10n.auditLoadingMore,
          child: const SizedBox.square(dimension: 24, child: CircularProgressIndicator(strokeWidth: 2)),
        ),
      );
    }
    if (error != null) {
      return Column(
        children: [
          Text(describeError(l10n, error), textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
          SizedBox(height: tokens.sm),
          _LoadMoreButton(feed: feed, label: l10n.retry),
        ],
      );
    }
    if (feed.hasMore) return Center(child: _LoadMoreButton(feed: feed));
    return Center(
      child: Text(l10n.auditEnd, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
    );
  }
}

class _LoadMoreButton extends ConsumerWidget {
  const _LoadMoreButton({required this.feed, this.label});

  final AuditFeed feed;
  final String? label;

  @override
  Widget build(BuildContext context, WidgetRef ref) => OutlinedButton.icon(
        onPressed: feed.loadingMore ? null : () => ref.read(auditFeedProvider.notifier).loadMore(),
        icon: const Icon(Icons.history),
        label: Text(label ?? AppLocalizations.of(context).auditLoadMore),
      );
}

class _Readable extends StatelessWidget {
  const _Readable({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth), child: child),
      );
}
