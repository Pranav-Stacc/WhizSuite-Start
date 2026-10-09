import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/lead.dart';
import 'lead_card.dart';
import 'lead_stage.dart';

/// What every board layout needs from the screen.
class LeadBoardCallbacks {
  const LeadBoardCallbacks({
    required this.onOpen,
    required this.onRefresh,
    required this.ownerName,
    this.onMove,
  });

  final ValueChanged<Lead> onOpen;
  final Future<void> Function() onRefresh;
  final String? Function(String? ownerId) ownerName;

  /// Null when the member may not change stages.
  final void Function(Lead lead, String stage)? onMove;
}

Map<String, List<Lead>> _byStage(List<Lead> leads) {
  final columns = {for (final stage in LeadStages.values) stage: <Lead>[]};
  for (final lead in leads) {
    columns[lead.stage]?.add(lead);
  }
  return columns;
}

/// Side-by-side stage columns with drag and drop between them (tablets and desktop).
class WideLeadBoard extends StatelessWidget {
  const WideLeadBoard({required this.leads, required this.summary, required this.callbacks, super.key});

  static const columnWidth = 296.0;

  final List<Lead> leads;
  final PipelineSummary summary;
  final LeadBoardCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final columns = _byStage(leads);
    return Scrollbar(
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.lg),
        itemCount: LeadStages.values.length,
        separatorBuilder: (_, _) => SizedBox(width: tokens.md),
        itemBuilder: (context, index) {
          final stage = LeadStages.values[index];
          return SizedBox(
            width: columnWidth,
            child: FadeSlideIn(
              index: index,
              child: _BoardColumn(
                stage: stage,
                total: summary[stage],
                leads: columns[stage] ?? const [],
                callbacks: callbacks,
              ),
            ),
          );
        },
      ),
    );
  }
}

class _BoardColumn extends StatelessWidget {
  const _BoardColumn({required this.stage, required this.total, required this.leads, required this.callbacks});

  static const _highlightAlpha = 0.06;

  final String stage;
  final StageTotal total;
  final List<Lead> leads;
  final LeadBoardCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final move = callbacks.onMove;
    return DragTarget<Lead>(
      onWillAcceptWithDetails: (details) => move != null && details.data.stage != stage,
      onAcceptWithDetails: (details) => move?.call(details.data, stage),
      builder: (context, candidates, _) {
        final hovering = candidates.isNotEmpty;
        return Semantics(
          label: hovering ? l10n.leadsColumnDrop(leadStageLabel(l10n, stage)) : null,
          child: AnimatedContainer(
            duration: AppMotion.fast,
            curve: AppMotion.standard,
            decoration: BoxDecoration(
              color: hovering ? tokens.primary.withValues(alpha: _highlightAlpha) : tokens.subtle,
              borderRadius: BorderRadius.circular(tokens.radius + 8),
              border: Border.all(color: hovering ? tokens.primary : tokens.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(tokens.md, tokens.md, tokens.md, tokens.sm),
                  child: StageHeader(stage: stage, total: total, currency: leads.isEmpty ? null : leads.first.currency),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: callbacks.onRefresh,
                    child: leads.isEmpty
                        ? _EmptyColumn(label: l10n.leadsColumnEmpty)
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: EdgeInsets.fromLTRB(tokens.sm, 0, tokens.sm, tokens.md),
                            itemCount: leads.length,
                            separatorBuilder: (_, _) => SizedBox(height: tokens.sm),
                            itemBuilder: (context, index) => _DraggableLead(
                              lead: leads[index],
                              enabled: move != null,
                              child: _card(leads[index]),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _card(Lead lead) {
    final move = callbacks.onMove;
    return LeadCard(
      lead: lead,
      ownerName: callbacks.ownerName(lead.ownerId),
      onTap: () => callbacks.onOpen(lead),
      onMove: move == null ? null : (stage) => move(lead, stage),
    );
  }
}

class _EmptyColumn extends StatelessWidget {
  const _EmptyColumn({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.all(tokens.lg),
      children: [
        Text(
          label,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
        ),
      ],
    );
  }
}

/// Mouse pointers drag immediately; touch needs a long press so columns still scroll.
class _DraggableLead extends StatelessWidget {
  const _DraggableLead({required this.lead, required this.enabled, required this.child});

  static const _draggingOpacity = 0.35;
  static const _feedbackElevation = 8.0;
  static const _desktop = {TargetPlatform.macOS, TargetPlatform.windows, TargetPlatform.linux};

  final Lead lead;
  final bool enabled;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return child;
    final tokens = context.tokens;
    final feedback = SizedBox(
      width: WideLeadBoard.columnWidth - tokens.lg,
      child: Material(
        elevation: _feedbackElevation,
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(tokens.radius + 6),
        child: child,
      ),
    );
    final placeholder = Opacity(opacity: _draggingOpacity, child: child);
    if (kIsWeb || _desktop.contains(defaultTargetPlatform)) {
      return Draggable<Lead>(data: lead, feedback: feedback, childWhenDragging: placeholder, child: child);
    }
    return LongPressDraggable<Lead>(data: lead, feedback: feedback, childWhenDragging: placeholder, child: child);
  }
}

/// Stage name with its lead count and total value.
class StageHeader extends StatelessWidget {
  const StageHeader({required this.stage, required this.total, this.currency, super.key});

  static const _dotSize = 8.0;

  final String stage;
  final StageTotal total;
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final value = context.formats.money(total.valueMinor, currency: currency, compact: true);
    return Semantics(
      header: true,
      child: Row(
        children: [
          Container(
            width: _dotSize,
            height: _dotSize,
            decoration: BoxDecoration(color: leadStageTone(stage).color(tokens), shape: BoxShape.circle),
          ),
          SizedBox(width: tokens.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(leadStageLabel(l10n, stage), style: text.titleSmall),
                Text(
                  l10n.leadsColumnSummary(total.count, value),
                  style: text.bodySmall?.copyWith(
                    color: tokens.muted,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Phone layout: the page header scrolls away, stage tabs stay pinned, and each stage
/// is a horizontally paged column.
class PhoneLeadBoard extends StatelessWidget {
  const PhoneLeadBoard({
    required this.leads,
    required this.summary,
    required this.header,
    required this.callbacks,
    super.key,
  });

  final List<Lead> leads;
  final PipelineSummary summary;
  final Widget header;
  final LeadBoardCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final columns = _byStage(leads);
    final tabBar = TabBar(
      isScrollable: true,
      tabAlignment: TabAlignment.start,
      tabs: [
        for (final stage in LeadStages.values)
          Tab(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(leadStageLabel(l10n, stage)),
                SizedBox(width: tokens.sm),
                _CountPill(count: summary[stage].count),
              ],
            ),
          ),
      ],
    );
    return DefaultTabController(
      length: LeadStages.values.length,
      child: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverToBoxAdapter(child: header),
          SliverOverlapAbsorber(
            handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
            sliver: SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(tabBar: tabBar, background: Theme.of(context).scaffoldBackgroundColor),
            ),
          ),
        ],
        body: TabBarView(
          children: [
            for (final stage in LeadStages.values)
              _StagePage(
                stage: stage,
                total: summary[stage],
                leads: columns[stage] ?? const [],
                callbacks: callbacks,
              ),
          ],
        ),
      ),
    );
  }
}

class _StagePage extends StatelessWidget {
  const _StagePage({required this.stage, required this.total, required this.leads, required this.callbacks});

  final String stage;
  final StageTotal total;
  final List<Lead> leads;
  final LeadBoardCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final move = callbacks.onMove;
    return RefreshIndicator(
      onRefresh: callbacks.onRefresh,
      child: CustomScrollView(
        key: PageStorageKey(stage),
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverOverlapInjector(handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context)),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
            sliver: SliverToBoxAdapter(
              child: StageHeader(stage: stage, total: total, currency: leads.isEmpty ? null : leads.first.currency),
            ),
          ),
          if (leads.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: EdgeInsets.all(tokens.xl),
                child: Text(
                  l10n.leadsColumnEmpty,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
                ),
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, tokens.xxl * 2),
              sliver: SliverList.separated(
                itemCount: leads.length,
                separatorBuilder: (_, _) => SizedBox(height: tokens.md),
                itemBuilder: (context, index) {
                  final lead = leads[index];
                  return FadeSlideIn(
                    index: index,
                    child: LeadCard(
                      lead: lead,
                      ownerName: callbacks.ownerName(lead.ownerId),
                      onTap: () => callbacks.onOpen(lead),
                      onMove: move == null ? null : (stage) => move(lead, stage),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: tokens.sm - 2, vertical: 1),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(tokens.radius + 999),
        border: Border.all(color: tokens.border),
      ),
      child: Text(
        context.formats.number(count),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate({required this.tabBar, required this.background});

  final TabBar tabBar;
  final Color background;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) =>
      ColoredBox(color: background, child: tabBar);

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => tabBar != oldDelegate.tabBar || background != oldDelegate.background;
}
