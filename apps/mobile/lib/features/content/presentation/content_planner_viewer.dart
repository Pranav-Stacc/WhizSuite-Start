import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/platform_limits.dart';
import 'content_labels.dart';
import 'content_media.dart';
import 'content_planner_layout.dart';
import 'content_post_options.dart';

/// Opens an Instagram-style fullscreen viewer for planner grid posts.
Future<void> openContentPlannerViewer(
  BuildContext context,
  WidgetRef ref, {
  required List<Content> posts,
  required int initialIndex,
  required String clientId,
  required String clientName,
  PlannerPlatformLayout layout = const PlannerPlatformLayout(columns: 3, aspectRatio: 4 / 5),
}) {
  if (posts.isEmpty) return Future<void>.value();
  final index = initialIndex.clamp(0, posts.length - 1);
  return Navigator.of(context).push<void>(
    PageRouteBuilder<void>(
      fullscreenDialog: true,
      opaque: true,
      transitionDuration: AppMotion.medium,
      reverseTransitionDuration: AppMotion.medium,
      pageBuilder: (context, animation, secondaryAnimation) => ContentPlannerViewer(
        posts: posts,
        initialIndex: index,
        clientId: clientId,
        clientName: clientName,
        layout: layout,
        onMore: (post) => showContentPostOptions(context, ref, content: post),
      ),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curve = CurvedAnimation(parent: animation, curve: AppMotion.standard);
        return FadeTransition(
          opacity: curve,
          child: SlideTransition(
            position: Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero).animate(curve),
            child: child,
          ),
        );
      },
    ),
  );
}

/// Fullscreen swipeable feed preview — one post per page, carousel inside each post.
class ContentPlannerViewer extends StatefulWidget {
  const ContentPlannerViewer({
    required this.posts,
    required this.initialIndex,
    required this.clientId,
    required this.clientName,
    required this.layout,
    required this.onMore,
    super.key,
  });

  final List<Content> posts;
  final int initialIndex;
  final String clientId;
  final String clientName;
  final PlannerPlatformLayout layout;
  final ValueChanged<Content> onMore;

  @override
  State<ContentPlannerViewer> createState() => _ContentPlannerViewerState();
}

class _ContentPlannerViewerState extends State<ContentPlannerViewer> {
  late final PageController _postController = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _postController.dispose();
    super.dispose();
  }

  void _goToPost(int index) {
    if (index < 0 || index >= widget.posts.length || index == _index) return;
    _postController.animateToPage(index, duration: AppMotion.medium, curve: AppMotion.standard);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final post = widget.posts[_index];

    return Scaffold(
      backgroundColor: tokens.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ViewerTopBar(
              clientId: widget.clientId,
              clientName: widget.clientName,
              post: post,
              positionLabel: l10n.contentPlannerPostPosition(_index + 1, widget.posts.length),
              onBack: () => Navigator.of(context).pop(),
              onMore: () => widget.onMore(post),
            ),
            Expanded(
              child: PageView.builder(
                controller: _postController,
                itemCount: widget.posts.length,
                onPageChanged: (page) => setState(() => _index = page),
                itemBuilder: (context, index) => _PlannerPostPage(
                  post: widget.posts[index],
                  clientId: widget.clientId,
                  clientName: widget.clientName,
                  layout: widget.layout,
                  gridPosition: index + 1,
                  heroTag: plannerPostHeroTag(widget.posts[index].id),
                ),
              ),
            ),
            _ViewerPostNav(
              index: _index,
              total: widget.posts.length,
              onPrevious: _index > 0 ? () => _goToPost(_index - 1) : null,
              onNext: _index < widget.posts.length - 1 ? () => _goToPost(_index + 1) : null,
              onManage: () => context.push(ContentRoutes.detail(post.id)),
            ),
          ],
        ),
      ),
    );
  }
}

String plannerPostHeroTag(String contentId) => 'content-planner-$contentId';

class _ViewerTopBar extends StatelessWidget {
  const _ViewerTopBar({
    required this.clientId,
    required this.clientName,
    required this.post,
    required this.positionLabel,
    required this.onBack,
    required this.onMore,
  });

  final String clientId;
  final String clientName;
  final Content post;
  final String positionLabel;
  final VoidCallback onBack;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final title = post.title.isEmpty ? l10n.contentUntitled : post.title;

    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.sm, tokens.sm, tokens.sm, tokens.md),
      child: Row(
        children: [
          IconButton(
            tooltip: MaterialLocalizations.of(context).backButtonTooltip,
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back),
          ),
          InitialsAvatar(name: clientName, seed: clientId, size: 36),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(clientName, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
                Text(
                  '$positionLabel · $title',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.labelSmall?.copyWith(color: tokens.muted),
                ),
              ],
            ),
          ),
          ContentStatusBadge(status: post.status, dense: true),
          IconButton(
            tooltip: l10n.contentOpenPost,
            onPressed: onMore,
            icon: const Icon(Icons.more_horiz),
          ),
        ],
      ),
    );
  }
}

class _PlannerPostPage extends StatelessWidget {
  const _PlannerPostPage({
    required this.post,
    required this.clientId,
    required this.clientName,
    required this.layout,
    required this.gridPosition,
    required this.heroTag,
  });

  final Content post;
  final String clientId;
  final String clientName;
  final PlannerPlatformLayout layout;
  final int gridPosition;
  final String heroTag;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final caption = publishedCaption(post.caption, post.hashtags);
    final scheduled = post.scheduledAt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Flexible(
          flex: 11,
          child: ColoredBox(
            color: Colors.black,
            child: Center(
              child: AspectRatio(
                aspectRatio: layout.aspectRatio,
                child: Hero(
                  tag: heroTag,
                  child: Material(
                    color: Colors.black,
                    child: ContentCarousel(
                      media: post.media,
                      fallbackIcon: contentTypeIcon(post.contentType),
                      immersive: true,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        Flexible(
          flex: 9,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    InitialsAvatar(name: clientName, seed: clientId, size: 32),
                    SizedBox(width: tokens.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(clientName, style: text.titleSmall),
                          Text(
                            contentTypeLabel(l10n, post.contentType),
                            style: text.labelSmall?.copyWith(color: tokens.muted),
                          ),
                        ],
                      ),
                    ),
                    if (post.platforms.isNotEmpty)
                      Icon(contentPlatformIcon(post.platforms.first), color: tokens.secondary, size: 20),
                  ],
                ),
                SizedBox(height: tokens.md),
                Row(
                  children: [
                    const Icon(Icons.favorite_border, size: 24),
                    SizedBox(width: tokens.lg),
                    const Icon(Icons.mode_comment_outlined, size: 24),
                    SizedBox(width: tokens.lg),
                    const Icon(Icons.send_outlined, size: 24),
                    const Spacer(),
                    const Icon(Icons.bookmark_border, size: 24),
                  ],
                ),
                SizedBox(height: tokens.md),
                if (caption.isEmpty)
                  Text(l10n.contentPreviewEmpty, style: text.bodyMedium?.copyWith(color: tokens.muted))
                else
                  SelectableText(
                    caption,
                    style: text.bodyMedium?.copyWith(height: 1.45),
                  ),
                SizedBox(height: tokens.md),
                Wrap(
                  spacing: tokens.sm,
                  runSpacing: tokens.xs,
                  children: [
                    TagChip(
                      label: l10n.contentPlannerTile(
                        post.title.isEmpty ? l10n.contentUntitled : post.title,
                        contentStatusLabel(l10n, post.status),
                        gridPosition,
                      ),
                      icon: Icons.grid_on_outlined,
                    ),
                    if (scheduled != null)
                      TagChip(label: formats.dateTime(scheduled), icon: Icons.schedule_outlined),
                    for (final platform in post.platforms) PlatformChip(platform: platform),
                  ],
                ),
                SizedBox(height: tokens.sm),
                Text(
                  l10n.contentPlannerSwipePosts,
                  style: text.labelSmall?.copyWith(color: tokens.muted),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ViewerPostNav extends StatelessWidget {
  const _ViewerPostNav({
    required this.index,
    required this.total,
    required this.onPrevious,
    required this.onNext,
    required this.onManage,
  });

  final int index;
  final int total;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final text = Theme.of(context).textTheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: tokens.surface,
        border: Border(top: BorderSide(color: tokens.border)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(tokens.md, tokens.sm, tokens.md, tokens.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: l10n.contentPlannerPostPrevious,
                  onPressed: onPrevious,
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Text(
                    l10n.contentPlannerPostPosition(index + 1, total),
                    style: text.labelLarge,
                    textAlign: TextAlign.center,
                  ),
                ),
                IconButton(
                  tooltip: l10n.contentPlannerPostNext,
                  onPressed: onNext,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                onPressed: onManage,
                child: Text(l10n.contentPlannerManagePost),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
