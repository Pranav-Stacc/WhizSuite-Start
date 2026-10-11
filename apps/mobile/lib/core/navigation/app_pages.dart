import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Push transition that stays on the scaffold colour (no fade-through-white).
CustomTransitionPage<T> slidePushPage<T>({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 220),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final bg = Theme.of(context).scaffoldBackgroundColor;
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      final offset = Tween<Offset>(begin: const Offset(0.035, 0), end: Offset.zero).animate(curved);
      return ColoredBox(
        color: bg,
        child: SlideTransition(position: offset, child: child),
      );
    },
  );
}
