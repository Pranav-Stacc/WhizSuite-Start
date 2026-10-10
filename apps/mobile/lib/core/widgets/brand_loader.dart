import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_tokens.dart';

/// Full-area brand loading animation: a pulsing monogram tile with orbiting dots above
/// a wordmark whose letters ripple in sequence. Respects reduced-motion settings.
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
    final tokens = context.tokens;
    final title = AppLocalizations.of(context).appTitle;
    return Semantics(
      label: MaterialLocalizations.of(context).refreshIndicatorSemanticLabel,
      child: ExcludeSemantics(
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _Monogram(letter: title.characters.first, progress: _controller.value),
                SizedBox(height: tokens.xl),
                _RippleWordmark(text: title, progress: _controller.value),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Monogram extends StatelessWidget {
  const _Monogram({required this.letter, required this.progress});

  static const _size = 96.0;
  static const _tileSize = 52.0;
  static const _pulse = 0.06;

  final String letter;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final scale = 1 + _pulse * math.sin(progress * 2 * math.pi);
    return SizedBox.square(
      dimension: _size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size.square(_size),
            painter: _OrbitPainter(progress: progress, primary: tokens.primary, secondary: tokens.secondary),
          ),
          Transform.rotate(
            angle: math.sin(progress * 2 * math.pi) * 0.08,
            child: Transform.scale(
              scale: scale,
              child: Container(
                width: _tileSize,
                height: _tileSize,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(tokens.radius + 6),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [tokens.primary, tokens.secondary],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: tokens.primary.withValues(alpha: 0.35 * scale),
                      blurRadius: 18 * scale,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Text(
                  letter,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: tokens.onPrimary,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Three dots chasing each other around the monogram, shrinking as they trail.
class _OrbitPainter extends CustomPainter {
  const _OrbitPainter({required this.progress, required this.primary, required this.secondary});

  static const _dots = 3;
  static const _trail = 0.22;
  static const _maxRadius = 5.0;

  final double progress;
  final Color primary;
  final Color secondary;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final orbit = size.shortestSide / 2 - _maxRadius;
    final eased = Curves.easeInOutCubic.transform(progress);
    for (var i = 0; i < _dots; i++) {
      final angle = (eased - i * _trail / _dots) * 2 * math.pi - math.pi / 2;
      final t = i / (_dots - 1);
      final paint = Paint()..color = Color.lerp(primary, secondary, t)!.withValues(alpha: 1 - t * 0.5);
      canvas.drawCircle(
        center + Offset(math.cos(angle), math.sin(angle)) * orbit,
        _maxRadius * (1 - t * 0.45),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_OrbitPainter old) =>
      old.progress != progress || old.primary != primary || old.secondary != secondary;
}

/// Letters lift and light up one after another, like a wave passing through the name.
class _RippleWordmark extends StatelessWidget {
  const _RippleWordmark({required this.text, required this.progress});

  static const _lift = 6.0;
  static const _stagger = 0.07;

  final String text;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final base = Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, letterSpacing: 1.2);
    final letters = text.characters.toList();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < letters.length; i++)
          Builder(builder: (context) {
            final phase = (progress - i * _stagger) % 1;
            final wave = math.max(0.0, math.sin(phase * 2 * math.pi));
            return Transform.translate(
              offset: Offset(0, -_lift * wave),
              child: Text(
                letters[i],
                style: base?.copyWith(color: Color.lerp(tokens.muted, tokens.primary, wave)),
              ),
            );
          }),
      ],
    );
  }
}
