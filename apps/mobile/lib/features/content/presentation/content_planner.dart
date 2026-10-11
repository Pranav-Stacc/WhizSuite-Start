import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/content_workflow.dart';
import 'content_labels.dart';
import 'content_media.dart';
import 'content_planner_layout.dart';
import 'content_planner_viewer.dart';
import 'content_post_options.dart';
import 'content_sheet.dart';

enum _PlannerView { grid, sheet }

/// Client feed planner: platform-aware grid preview and day-wise sheet view.
class ContentPlanner extends ConsumerStatefulWidget {
  const ContentPlanner({super.key, this.initialClientId});

  final String? initialClientId;

  @override
  ConsumerState<ContentPlanner> createState() => _ContentPlannerState();
}

class _ContentPlannerState extends ConsumerState<ContentPlanner> with AutomaticKeepAliveClientMixin {
  static const _dragAlpha = 0.35;

  late String? _clientId = widget.initialClientId != null && widget.initialClientId!.isNotEmpty
      ? widget.initialClientId
      : null;
  String? _platform;
  _PlannerView _view = _PlannerView.grid;
  late DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  bool _hideEmptyDays = false;

  List<Content>? _pending;
  bool _saving = false;

  @override
  bool get wantKeepAlive => true;

  Future<void> _commit(String clientId, List<Content> current, List<Content> next) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _pending = next;
      _saving = true;
    });
    final ok = await runAction(
      context,
      () => ref.read(contentActionsProvider).reorder(clientId, [for (final c in next) c.id]),
      success: l10n.contentPlannerSaved,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (!ok) _pending = current;
    });
    if (ok) {
      await ref.read(contentListProvider.future);
      if (mounted) setState(() => _pending = null);
    }
  }

  void _move(String clientId, List<Content> current, int from, int to) {
    if (from == to || to < 0 || to >= current.length) return;
    _commit(clientId, current, moveItem(current, from, to));
  }

  void _shiftMonth(int delta) => setState(() => _month = DateTime(_month.year, _month.month + delta));

  void _openViewer(BuildContext context, String clientId, String clientName, List<Content> posts, Content post) {
    final index = posts.indexWhere((item) => item.id == post.id);
    openContentPlannerViewer(
      context,
      ref,
      posts: posts,
      initialIndex: index < 0 ? 0 : index,
      clientId: clientId,
      clientName: clientName,
      layout: PlannerPlatformLayout.forPlatform(_platform),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final content = ref.watch(contentListProvider);
    final clients = ref.watch(clientDirectoryProvider).value;
    return AsyncValueView<List<Content>>(
      value: content,
      onRetry: () => ref.invalidate(contentListProvider),
      isEmpty: (items) => items.isEmpty,
      empty: EmptyState(
        icon: Icons.grid_view_outlined,
        title: l10n.contentPlannerEmpty,
        body: l10n.contentPlannerEmptyBody,
        action: PermissionGate(
          anyOf: const [Permissions.contentCreate],
          child: FilledButton.icon(
            onPressed: () => context.push(ContentRoutes.compose()),
            icon: const Icon(Icons.add),
            label: Text(l10n.contentNew),
          ),
        ),
      ),
      data: (items) {
        final clientIds = {for (final c in items) c.clientId}.toList()
          ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));
        final clientId = _clientId ?? clientIds.firstOrNull;
        if (clientId == null) return const SizedBox.shrink();
        final clientPosts = items.where((c) => c.clientId == clientId).toList();
        final serverOrder = orderForGrid(
          clientPosts,
          positionOf: (c) => c.gridPosition,
          placedAt: (c) => c.scheduledAt ?? c.createdAt,
        );
        final pending = _pending;
        final order = pending != null && pending.every((c) => c.clientId == clientId) ? pending : serverOrder;
        final filtered = _platform == null
            ? order
            : order.where((post) => post.platforms.contains(_platform)).toList();
        final clientName = clients?.nameOf(clientId) ?? l10n.valueUnknown;
        final platforms = {
          for (final post in clientPosts)
            for (final platform in post.platforms) platform,
        }.toList()
          ..sort();
        final connected = ref.watch(contentConnectedPlatformsProvider(clientId)).value ?? platforms.toSet();
        final platformOptions = platforms.isEmpty ? connected.toList() : platforms;
        final reviewCount = clientPosts.where((p) => p.status == ContentStatuses.inReview).length;
        final changesCount = clientPosts.where((p) => p.status == ContentStatuses.changesRequested).length;

        return ReadableBody(
          onRefresh: () => ref.refresh(contentListProvider.future),
          children: [
            FadeSlideIn(
              child: SegmentedButton<_PlannerView>(
                segments: [
                  ButtonSegment(value: _PlannerView.grid, label: Text(l10n.contentPlannerViewGrid), icon: const Icon(Icons.grid_on_outlined)),
                  ButtonSegment(value: _PlannerView.sheet, label: Text(l10n.contentPlannerViewSheet), icon: const Icon(Icons.table_rows_outlined)),
                ],
                selected: {_view},
                onSelectionChanged: (value) => setState(() => _view = value.first),
              ),
            ),
            SizedBox(height: context.tokens.md),
            if (widget.initialClientId == null && clientIds.length > 1)
              FadeSlideIn(
                index: 1,
                child: OptionField<String>(
                  key: ValueKey(clientId),
                  label: l10n.contentFilterClient,
                  value: clientId,
                  options: clientIds,
                  labelOf: (id) => clients?.nameOf(id) ?? l10n.valueUnknown,
                  onChanged: (id) => setState(() {
                    _clientId = id;
                    _pending = null;
                  }),
                ),
              ),
            if (reviewCount > 0 || changesCount > 0) ...[
              SizedBox(height: context.tokens.md),
              FadeSlideIn(
                index: 2,
                child: _PendingStrip(
                  reviewCount: reviewCount,
                  changesCount: changesCount,
                  posts: clientPosts
                      .where((p) => p.status == ContentStatuses.inReview || p.status == ContentStatuses.changesRequested)
                      .toList(),
                  onOpen: (post) => _openViewer(context, clientId, clientName, order, post),
                  onMore: (post) => showContentPostOptions(context, ref, content: post),
                ),
              ),
            ],
            if (_view == _PlannerView.grid) ...[
              if (platformOptions.isNotEmpty) ...[
                SizedBox(height: context.tokens.md),
                FadeSlideIn(
                  index: 3,
                  child: _PlatformTabs(
                    platforms: platformOptions,
                    selected: _platform,
                    onSelected: (platform) => setState(() => _platform = platform),
                  ),
                ),
              ],
              SizedBox(height: context.tokens.lg),
              FadeSlideIn(
                index: 4,
                child: _PhoneFrame(
                  clientId: clientId,
                  clientName: clientName,
                  posts: filtered,
                  saving: _saving,
                  layout: PlannerPlatformLayout.forPlatform(_platform),
                  grid: _grid(context, clientId, clientName, filtered, PlannerPlatformLayout.forPlatform(_platform)),
                  legend: _StatusLegend(posts: clientPosts),
                ),
              ),
            ] else ...[
              SizedBox(height: context.tokens.md),
              FadeSlideIn(
                index: 3,
                child: _SheetToolbar(
                  month: _month,
                  hideEmptyDays: _hideEmptyDays,
                  onPrevious: () => _shiftMonth(-1),
                  onNext: () => _shiftMonth(1),
                  onToggleEmpty: () => setState(() => _hideEmptyDays = !_hideEmptyDays),
                ),
              ),
              SizedBox(height: context.tokens.md),
              FadeSlideIn(
                index: 4,
                child: ContentSheet(
                  columns: ContentSheet.columnsForMonth(
                    month: _month,
                    posts: clientPosts,
                    hideEmptyDays: _hideEmptyDays,
                  ),
                  onNewPost: (scheduledAt) => context.push(ContentRoutes.compose(clientId: clientId, scheduledAt: scheduledAt)),
                  onPostTap: (post) => _openViewer(context, clientId, clientName, order, post),
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _grid(BuildContext context, String clientId, String clientName, List<Content> order, PlannerPlatformLayout layout) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final canReorder = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentEdit))) && !_saving;
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = layout.columns;
        final tileWidth = (constraints.maxWidth - (columns - 1)) / columns;
        final tileSize = Size(tileWidth, tileWidth / layout.aspectRatio);
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: 1,
            crossAxisSpacing: 1,
            childAspectRatio: layout.aspectRatio,
          ),
          itemCount: order.length + 1,
          itemBuilder: (context, index) {
            if (index == 0) {
              return PermissionGate(
                anyOf: const [Permissions.contentCreate],
                fallback: ColoredBox(color: tokens.surface),
                child: _NewTile(onTap: () => context.push(ContentRoutes.compose(clientId: clientId))),
              );
            }
            final position = index - 1;
            final post = order[position];
            final tile = _GridTile(
              post: post,
              position: position,
              onTap: () => _openViewer(context, clientId, clientName, order, post),
              onMore: () => showContentPostOptions(context, ref, content: post),
            );
            if (!canReorder) return tile;
            return Semantics(
              customSemanticsActions: {
                if (position > 0)
                  CustomSemanticsAction(label: l10n.contentPlannerMoveEarlier): () =>
                      _move(clientId, order, position, position - 1),
                if (position < order.length - 1)
                  CustomSemanticsAction(label: l10n.contentPlannerMoveLater): () =>
                      _move(clientId, order, position, position + 1),
              },
              child: DragTarget<int>(
                onWillAcceptWithDetails: (details) => details.data != position,
                onAcceptWithDetails: (details) => _move(clientId, order, details.data, position),
                builder: (context, candidates, _) => LongPressDraggable<int>(
                  data: position,
                  feedback: SizedBox.fromSize(
                    size: tileSize,
                    child: Material(elevation: 6, child: _GridTile(post: post, position: position)),
                  ),
                  childWhenDragging: Opacity(opacity: _dragAlpha, child: tile),
                  child: AnimatedContainer(
                    duration: AppMotion.fast,
                    foregroundDecoration: BoxDecoration(
                      border: candidates.isEmpty ? null : Border.all(color: tokens.fg, width: 2),
                    ),
                    child: tile,
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _PlatformTabs extends StatelessWidget {
  const _PlatformTabs({required this.platforms, required this.selected, required this.onSelected});

  final List<String> platforms;
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.contentPlannerPlatforms, style: Theme.of(context).textTheme.labelLarge),
        SizedBox(height: tokens.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              FilterChip(
                label: Text(l10n.contentPlannerPlatformsAll),
                selected: selected == null,
                showCheckmark: false,
                onSelected: (_) => onSelected(null),
              ),
              for (final platform in platforms) ...[
                SizedBox(width: tokens.sm),
                FilterChip(
                  avatar: Icon(contentPlatformIcon(platform), size: 16),
                  label: Text(contentPlatformLabel(l10n, platform)),
                  selected: selected == platform,
                  showCheckmark: false,
                  onSelected: (_) => onSelected(platform),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _PendingStrip extends StatelessWidget {
  const _PendingStrip({
    required this.reviewCount,
    required this.changesCount,
    required this.posts,
    required this.onOpen,
    required this.onMore,
  });

  final int reviewCount;
  final int changesCount;
  final List<Content> posts;
  final ValueChanged<Content> onOpen;
  final ValueChanged<Content> onMore;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.pending_actions_outlined, color: StatusTone.warning.color(tokens), size: 18),
              SizedBox(width: tokens.sm),
              Expanded(child: Text(l10n.contentPlannerPending, style: Theme.of(context).textTheme.titleSmall)),
            ],
          ),
          SizedBox(height: tokens.xs),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.xs,
            children: [
              if (reviewCount > 0) TagChip(label: l10n.contentPlannerPendingReview(reviewCount), icon: Icons.rate_review_outlined),
              if (changesCount > 0) TagChip(label: l10n.contentPlannerPendingChanges(changesCount), icon: Icons.edit_note_outlined),
            ],
          ),
          SizedBox(height: tokens.md),
          SizedBox(
            height: 72,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: posts.length,
              separatorBuilder: (_, _) => SizedBox(width: tokens.sm),
              itemBuilder: (context, index) {
                final post = posts[index];
                final title = post.title.isEmpty ? l10n.contentUntitled : post.title;
                return InkWell(
                  onTap: () => onOpen(post),
                  onLongPress: () => onMore(post),
                  child: SizedBox(
                    width: 180,
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(tokens.radius),
                          child: SizedBox.square(
                            dimension: 48,
                            child: ContentMediaThumb(media: post.cover, fallbackIcon: contentTypeIcon(post.contentType)),
                          ),
                        ),
                        SizedBox(width: tokens.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelLarge),
                              ContentStatusBadge(status: post.status, dense: true),
                            ],
                          ),
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.more_horiz, size: 18),
                          onPressed: () => onMore(post),
                        ),
                      ],
                    ),
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

class _SheetToolbar extends StatelessWidget {
  const _SheetToolbar({
    required this.month,
    required this.hideEmptyDays,
    required this.onPrevious,
    required this.onNext,
    required this.onToggleEmpty,
  });

  final DateTime month;
  final bool hideEmptyDays;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToggleEmpty;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    return Row(
      children: [
        IconButton(onPressed: onPrevious, icon: const Icon(Icons.chevron_left)),
        IconButton(onPressed: onNext, icon: const Icon(Icons.chevron_right)),
        Expanded(
          child: Text(
            DateFormat.yMMMM(locale).format(month),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ),
        FilterChip(
          label: Text(l10n.contentSheetHideEmpty),
          selected: hideEmptyDays,
          showCheckmark: false,
          onSelected: (_) => onToggleEmpty(),
        ),
      ],
    );
  }
}

class _StatusLegend extends StatelessWidget {
  const _StatusLegend({required this.posts});

  final List<Content> posts;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final counts = <String, int>{};
    for (final post in posts) {
      counts[post.status] = (counts[post.status] ?? 0) + 1;
    }
    final statuses = counts.keys.toList()..sort((a, b) => contentStatusLabel(l10n, a).compareTo(contentStatusLabel(l10n, b)));
    if (statuses.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: tokens.md,
      runSpacing: tokens.sm,
      children: [
        for (final status in statuses)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: contentStatusTone(status).color(tokens), shape: BoxShape.circle),
              ),
              SizedBox(width: tokens.xs),
              Text('${contentStatusLabel(l10n, status)} · ${counts[status]}', style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
      ],
    );
  }
}

class _PhoneFrame extends StatelessWidget {
  const _PhoneFrame({
    required this.clientId,
    required this.clientName,
    required this.posts,
    required this.saving,
    required this.layout,
    required this.grid,
    required this.legend,
  });

  static const _outerRadius = 28.0;
  static const _innerRadius = 20.0;
  static const _notchWidth = 72.0;
  static const _notchHeight = 14.0;
  static const _avatarSize = 52.0;

  final String clientId;
  final String clientName;
  final List<Content> posts;
  final bool saving;
  final PlannerPlatformLayout layout;
  final Widget grid;
  final Widget legend;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final live = posts.where((p) => p.status == ContentStatuses.published).length;
    final eyebrow = text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.8);
    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                padding: EdgeInsets.all(tokens.sm + 2),
                decoration: BoxDecoration(
                  color: tokens.surface,
                  borderRadius: BorderRadius.circular(_outerRadius),
                  border: Border.all(color: tokens.border),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(_innerRadius),
                  child: ColoredBox(
                    color: tokens.bg,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(height: tokens.sm),
                        Center(
                          child: Container(
                            width: _notchWidth,
                            height: _notchHeight,
                            decoration: BoxDecoration(color: tokens.fg, borderRadius: BorderRadius.circular(_notchHeight)),
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.all(tokens.md),
                          child: Row(
                            children: [
                              InitialsAvatar(name: clientName, seed: clientId, size: _avatarSize),
                              SizedBox(width: tokens.md),
                              Expanded(child: _Stat(value: posts.length, label: l10n.contentPlannerPosts)),
                              Expanded(child: _Stat(value: posts.length - live, label: l10n.contentPlannerPlanned)),
                              Expanded(child: _Stat(value: live, label: l10n.contentPlannerLive)),
                            ],
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(tokens.md, 0, tokens.md, tokens.sm),
                          child: Semantics(header: true, child: Text(clientName, style: text.titleSmall)),
                        ),
                        DecoratedBox(
                          decoration: BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: tokens.border))),
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: tokens.md, vertical: tokens.sm),
                            child: Row(
                              children: [
                                Expanded(child: Text(l10n.contentPlannerFeed.toUpperCase(), style: eyebrow)),
                                Semantics(
                                  liveRegion: true,
                                  child: Text(saving ? l10n.contentPlannerSaving : l10n.contentPlannerHint, style: eyebrow),
                                ),
                              ],
                            ),
                          ),
                        ),
                        grid,
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (constraints.maxWidth >= 720) ...[
              SizedBox(width: tokens.lg),
              SizedBox(width: 220, child: legend),
            ],
          ],
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Semantics(
      label: '$value $label',
      child: ExcludeSemantics(
        child: Column(
          children: [
            Text(context.formats.number(value), style: text.titleMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
            Text(label, style: text.labelSmall?.copyWith(color: context.tokens.muted)),
          ],
        ),
      ),
    );
  }
}

class _NewTile extends StatelessWidget {
  const _NewTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return Material(
      color: tokens.surface,
      child: InkWell(
        onTap: onTap,
        child: Semantics(
          button: true,
          label: l10n.contentNew,
          child: ExcludeSemantics(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add, color: tokens.muted),
                SizedBox(height: tokens.xs),
                Text(l10n.contentNew, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.muted)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GridTile extends StatelessWidget {
  const _GridTile({required this.post, required this.position, this.onTap, this.onMore});

  static const _dotSize = 8.0;

  final Content post;
  final int position;
  final VoidCallback? onTap;
  final VoidCallback? onMore;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final title = post.title.isEmpty ? l10n.contentUntitled : post.title;
    final multi = post.media.length > 1 || post.contentType == ContentTypes.carousel;
    final motion = post.contentType == ContentTypes.reel || post.contentType == ContentTypes.video;
    return Semantics(
      button: onTap != null,
      label: l10n.contentPlannerTile(title, contentStatusLabel(l10n, post.status), position + 1),
      child: ExcludeSemantics(
        child: Material(
          color: tokens.subtle,
          child: InkWell(
            onTap: onTap,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Hero(
                  tag: plannerPostHeroTag(post.id),
                  child: ContentMediaThumb(media: post.cover, fallbackIcon: contentTypeIcon(post.contentType)),
                ),
                if (onMore != null)
                  PositionedDirectional(
                    top: tokens.xs,
                    end: tokens.xs,
                    child: Material(
                      color: Colors.black45,
                      borderRadius: BorderRadius.circular(999),
                      child: InkWell(
                        onTap: onMore,
                        customBorder: const CircleBorder(),
                        child: const Padding(
                          padding: EdgeInsets.all(2),
                          child: Icon(Icons.more_horiz, size: 16, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                if (multi || motion)
                  PositionedDirectional(
                    top: tokens.xs,
                    start: tokens.xs,
                    child: Icon(
                      motion ? Icons.movie_outlined : Icons.collections_outlined,
                      size: 16,
                      color: Colors.white,
                      shadows: const [Shadow(blurRadius: 4)],
                    ),
                  ),
                PositionedDirectional(
                  bottom: tokens.xs,
                  start: tokens.xs,
                  child: Container(
                    width: _dotSize,
                    height: _dotSize,
                    decoration: BoxDecoration(
                      color: contentStatusTone(post.status).color(tokens),
                      shape: BoxShape.circle,
                      border: Border.all(color: tokens.bg, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
