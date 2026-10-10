import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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

/// Instagram-profile mock-up of one client's planned feed. Long-press and drag tiles to re-plan
/// the grid; screen-reader users get "move earlier / later" actions on each tile.
class ContentPlanner extends ConsumerStatefulWidget {
  const ContentPlanner({super.key, this.initialClientId});

  final String? initialClientId;

  @override
  ConsumerState<ContentPlanner> createState() => _ContentPlannerState();
}

class _ContentPlannerState extends ConsumerState<ContentPlanner> with AutomaticKeepAliveClientMixin {
  static const _columns = 3;
  static const _tileAspect = 4 / 5;
  static const _phoneMaxWidth = 440.0;
  static const _dragAlpha = 0.35;

  late String? _clientId = widget.initialClientId != null && widget.initialClientId!.isNotEmpty
      ? widget.initialClientId
      : null;

  /// Optimistic order shown while a reorder is saving; null means "use server order".
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
        final clientId = clientIds.contains(_clientId) ? _clientId : clientIds.firstOrNull;
        if (clientId == null) return const SizedBox.shrink();
        final serverOrder = orderForGrid(
          items.where((c) => c.clientId == clientId),
          positionOf: (c) => c.gridPosition,
          placedAt: (c) => c.scheduledAt ?? c.createdAt,
        );
        final pending = _pending;
        final order = pending != null && pending.every((c) => c.clientId == clientId) ? pending : serverOrder;
        final clientName = clients?.nameOf(clientId) ?? l10n.valueUnknown;
        return ReadableBody(
          onRefresh: () => ref.refresh(contentListProvider.future),
          children: [
            if (clientIds.length > 1)
              FadeSlideIn(
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
            SizedBox(height: context.tokens.lg),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: _phoneMaxWidth),
                child: FadeSlideIn(
                  index: 1,
                  child: _PhoneFrame(
                    clientId: clientId,
                    clientName: clientName,
                    posts: order,
                    saving: _saving,
                    grid: _grid(context, clientId, order),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _grid(BuildContext context, String clientId, List<Content> order) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final canReorder = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentEdit))) && !_saving;
    return LayoutBuilder(
      builder: (context, constraints) {
        final tileWidth = (constraints.maxWidth - (_columns - 1)) / _columns;
        final tileSize = Size(tileWidth, tileWidth / _tileAspect);
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: _columns,
            mainAxisSpacing: 1,
            crossAxisSpacing: 1,
            childAspectRatio: _tileAspect,
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
            final tile = _GridTile(post: post, position: position, onTap: () => context.go(ContentRoutes.detail(post.id)));
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

class _PhoneFrame extends StatelessWidget {
  const _PhoneFrame({
    required this.clientId,
    required this.clientName,
    required this.posts,
    required this.saving,
    required this.grid,
  });

  static const _outerRadius = 40.0;
  static const _innerRadius = 30.0;
  static const _notchWidth = 88.0;
  static const _notchHeight = 18.0;
  static const _avatarSize = 60.0;

  final String clientId;
  final String clientName;
  final List<Content> posts;
  final bool saving;
  final Widget grid;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final live = posts.where((p) => p.status == ContentStatuses.published).length;
    final eyebrow = text.labelSmall?.copyWith(color: tokens.muted, letterSpacing: 0.8);
    return Container(
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
                padding: EdgeInsets.all(tokens.lg),
                child: Row(
                  children: [
                    InitialsAvatar(name: clientName, seed: clientId, size: _avatarSize),
                    SizedBox(width: tokens.lg),
                    Expanded(child: _Stat(value: posts.length, label: l10n.contentPlannerPosts)),
                    Expanded(child: _Stat(value: posts.length - live, label: l10n.contentPlannerPlanned)),
                    Expanded(child: _Stat(value: live, label: l10n.contentPlannerLive)),
                  ],
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, tokens.md),
                child: Semantics(header: true, child: Text(clientName, style: text.titleSmall)),
              ),
              DecoratedBox(
                decoration: BoxDecoration(border: Border.symmetric(horizontal: BorderSide(color: tokens.border))),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.sm),
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
  const _GridTile({required this.post, required this.position, this.onTap});

  static const _dotSize = 8.0;

  final Content post;
  final int position;
  final VoidCallback? onTap;

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
                ContentMediaThumb(media: post.cover, fallbackIcon: contentTypeIcon(post.contentType)),
                if (multi || motion)
                  PositionedDirectional(
                    top: tokens.xs,
                    end: tokens.xs,
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
