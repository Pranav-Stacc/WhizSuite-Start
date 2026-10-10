import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Fades and lifts its child into place, mirroring the web `fade-up` animation.
/// [index] staggers list items; skipped entirely when the OS asks for reduced motion.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({required this.child, this.index = 0, this.offset = _defaultOffset, super.key});

  static const _defaultOffset = 8.0;
  static const _staggerMs = 35;
  static const _maxStaggered = 10;

  final Widget child;
  final int index;

  /// Vertical travel distance in logical pixels (larger = more presence).
  final double offset;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  CurvedAnimation? _curve;
  bool _done = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _stop();
      return;
    }
    if (_done || _controller != null) return;

    final delay = Duration(milliseconds: FadeSlideIn._staggerMs * widget.index.clamp(0, FadeSlideIn._maxStaggered));
    final total = AppMotion.slow + delay;
    final start = delay.inMilliseconds / total.inMilliseconds;
    _controller = AnimationController(vsync: this, duration: total)
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed && mounted) {
          // Collapse to [child] on the next frame; disposing here races AnimatedBuilder.
          setState(() => _done = true);
        }
      });
    _curve = CurvedAnimation(parent: _controller!, curve: Interval(start, 1, curve: AppMotion.emphasized));
    _controller!.forward();
  }

  void _stop() {
    _curve?.dispose();
    _controller?.dispose();
    _curve = null;
    _controller = null;
  }

  @override
  void dispose() {
    _stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context) || _done) return widget.child;
    final curve = _curve;
    if (curve == null) return widget.child;

    // Fade + slide while animating. Semantics are excluded until the animation
    // finishes and this widget collapses to [child] — avoids toggling opacity
    // semantics mid-layout (`!semantics.parentDataDirty`).
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: curve,
        child: widget.child,
        builder: (context, child) => ExcludeSemantics(
          child: Opacity(
            opacity: curve.value,
            child: Transform.translate(
              offset: Offset(0, (1 - curve.value) * widget.offset),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
