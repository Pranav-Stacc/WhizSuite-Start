import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/content.dart';

/// Cover image of a slide, or an icon tile for video, documents and slides that are not ready.
class ContentMediaThumb extends StatelessWidget {
  const ContentMediaThumb({required this.media, this.fallbackIcon = Icons.image_outlined, this.fit = BoxFit.cover, super.key});

  final ContentMedia? media;
  final IconData fallbackIcon;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final item = media;
    final url = item?.url;
    final placeholder = ColoredBox(
      color: tokens.subtle,
      child: Center(
        child: Icon(
          item == null ? fallbackIcon : (item.isVideo ? Icons.play_circle_outline : (item.isImage ? Icons.image_outlined : Icons.description_outlined)),
          color: tokens.muted,
        ),
      ),
    );
    if (item == null || url == null || !item.isImage) {
      return Semantics(image: true, label: item?.name, child: ExcludeSemantics(child: placeholder));
    }
    return Semantics(
      image: true,
      label: item.name,
      child: Image.network(
        url,
        fit: fit,
        excludeFromSemantics: true,
        loadingBuilder: (context, child, progress) => progress == null ? child : const Shimmer(child: SkeletonBox(height: double.infinity)),
        errorBuilder: (_, _, _) => placeholder,
      ),
    );
  }
}

/// Swipeable slides with a position indicator, the core of the post preview.
class ContentCarousel extends StatefulWidget {
  const ContentCarousel({
    required this.media,
    required this.fallbackIcon,
    this.immersive = false,
    super.key,
  });

  final List<ContentMedia> media;
  final IconData fallbackIcon;
  final bool immersive;

  @override
  State<ContentCarousel> createState() => _ContentCarouselState();
}

class _ContentCarouselState extends State<ContentCarousel> {
  static const _dotSize = 6.0;
  static const _activeDotWidth = 16.0;

  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(int page) => _controller.animateToPage(page, duration: AppMotion.medium, curve: AppMotion.standard);

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    final media = widget.media;
    if (media.isEmpty) return ContentMediaThumb(media: null, fallbackIcon: widget.fallbackIcon);
    final count = media.length;
    return Semantics(
      label: l10n.contentSlidePosition(_page + 1, count),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: count,
            onPageChanged: (page) => setState(() => _page = page),
            itemBuilder: (context, index) => ContentMediaThumb(media: media[index]),
          ),
          if (widget.immersive && count > 1)
            Positioned.fill(
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _page > 0 ? () => _go(_page - 1) : null,
                    ),
                  ),
                  const Expanded(flex: 2, child: SizedBox.expand()),
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _page < count - 1 ? () => _go(_page + 1) : null,
                    ),
                  ),
                ],
              ),
            ),
          if (count > 1) ...[
            PositionedDirectional(
              top: tokens.sm,
              end: tokens.sm,
              child: _Pill(label: '${_page + 1}/$count'),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: tokens.sm,
              child: ExcludeSemantics(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < count; i++)
                      AnimatedContainer(
                        duration: AppMotion.fast,
                        margin: EdgeInsets.symmetric(horizontal: tokens.xs / 2),
                        width: i == _page ? _activeDotWidth : _dotSize,
                        height: _dotSize,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: i == _page ? 1 : 0.6),
                          borderRadius: BorderRadius.circular(_dotSize),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (!widget.immersive) ...[
              if (_page > 0)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: _NavButton(icon: Icons.chevron_left, tooltip: l10n.contentSlidePrevious, onPressed: () => _go(_page - 1)),
                ),
              if (_page < count - 1)
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: _NavButton(icon: Icons.chevron_right, tooltip: l10n.contentSlideNext, onPressed: () => _go(_page + 1)),
                ),
            ],
          ],
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  static const _scrimAlpha = 0.55;

  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ExcludeSemantics(
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: _scrimAlpha),
          borderRadius: BorderRadius.circular(tokens.radius + 999),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white, fontFeatures: const [FontFeature.tabularFigures()]),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.tooltip, required this.onPressed});

  static const _scrimAlpha = 0.35;

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        style: IconButton.styleFrom(backgroundColor: Colors.black.withValues(alpha: _scrimAlpha), foregroundColor: Colors.white),
        icon: Icon(icon),
      );
}
