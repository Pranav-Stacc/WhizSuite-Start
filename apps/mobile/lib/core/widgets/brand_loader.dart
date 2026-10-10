import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../brand/app_brand.dart';
import '../theme/app_tokens.dart';
import 'app_logo.dart';

/// Full-area brand loading animation using the official WhizSuite wordmark.
class BrandLoader extends StatefulWidget {
  const BrandLoader({super.key});

  @override
  State<BrandLoader> createState() => _BrandLoaderState();
}

class _BrandLoaderState extends State<BrandLoader> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: AppMotion.brandLoop);

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
    return Semantics(
      label: MaterialLocalizations.of(context).refreshIndicatorSemanticLabel,
      child: ExcludeSemantics(
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final pulse = 0.94 + 0.06 * math.sin(_controller.value * 2 * math.pi);
              return Transform.scale(
                scale: pulse,
                child: const AppLogo.primary(height: AppBrand.primaryLogoHeight + 10),
              );
            },
          ),
        ),
      ),
    );
  }
}
