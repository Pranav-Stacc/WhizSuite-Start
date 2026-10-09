import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Sweeps a highlight across its skeleton children. Respects reduced-motion settings.
class Shimmer extends StatefulWidget {
  const Shimmer({required this.child, super.key});

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: AppMotion.shimmer);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final highlight = Color.lerp(tokens.subtle, tokens.surface, 0.7)!;
    return Semantics(
      label: MaterialLocalizations.of(context).refreshIndicatorSemanticLabel,
      child: ExcludeSemantics(
        child: AnimatedBuilder(
          animation: _controller,
          child: widget.child,
          builder: (context, child) => ShaderMask(
            blendMode: BlendMode.srcATop,
            shaderCallback: (bounds) {
              final dx = (_controller.value * 3 - 1) * bounds.width;
              return LinearGradient(
                colors: [tokens.subtle, highlight, tokens.subtle],
                stops: const [0.35, 0.5, 0.65],
              ).createShader(Rect.fromLTWH(dx - bounds.width, 0, bounds.width * 2, bounds.height));
            },
            child: child,
          ),
        ),
      ),
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({this.width, this.height = 14, this.radius, super.key});

  final double? width;
  final double height;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: BorderRadius.circular(radius ?? tokens.radius),
      ),
    );
  }
}

/// Placeholder list shaped like the rows it stands in for.
class SkeletonList extends StatelessWidget {
  const SkeletonList({this.itemCount = 6, this.leading = true, super.key});

  final int itemCount;
  final bool leading;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Shimmer(
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.all(tokens.lg),
        itemCount: itemCount,
        separatorBuilder: (_, _) => SizedBox(height: tokens.lg),
        itemBuilder: (context, index) => Row(
          children: [
            if (leading) ...[
              SkeletonBox(width: 40, height: 40, radius: tokens.radius + 4),
              SizedBox(width: tokens.md),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FractionallySizedBox(widthFactor: index.isEven ? 0.7 : 0.5, child: const SkeletonBox()),
                  SizedBox(height: tokens.sm),
                  const FractionallySizedBox(widthFactor: 0.9, child: SkeletonBox(height: 10)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
