import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Fades and lifts its child into place, mirroring the web `fade-up` animation.
/// [index] staggers list items; skipped entirely when the OS asks for reduced motion.
class FadeSlideIn extends StatelessWidget {
  const FadeSlideIn({required this.child, this.index = 0, super.key});

  static const _offset = 8.0;
  static const _staggerMs = 35;
  static const _maxStaggered = 10;

  final Widget child;
  final int index;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final delay = Duration(milliseconds: _staggerMs * index.clamp(0, _maxStaggered));
    final total = AppMotion.slow + delay;
    final start = delay.inMilliseconds / total.inMilliseconds;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: total,
      curve: Interval(start, 1, curve: AppMotion.emphasized),
      child: child,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, (1 - t) * _offset), child: child),
      ),
    );
  }
}
