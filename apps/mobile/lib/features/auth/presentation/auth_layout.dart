import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/app_logo.dart';
import '../../../core/widgets/fade_slide_in.dart';
/// Immersive frame shared by sign-in and registration — brand-first, one composition.
class AuthLayout extends StatelessWidget {
  const AuthLayout({required this.title, required this.subtitle, required this.form, required this.footer, super.key});

  static const _maxWidth = 400.0;

  final String title;
  final String subtitle;
  final Widget form;
  final Widget footer;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: tokens.bg,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _AuthAtmosphere(),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(tokens.xl, tokens.xxl, tokens.xl, tokens.xxl),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: _maxWidth),
                  child: AutofillGroup(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FadeSlideIn(
                          offset: 20,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const AppLogo.primary(height: 40),
                              SizedBox(height: tokens.md),
                              const _BrandAccentBar(),
                            ],
                          ),
                        ),
                        SizedBox(height: tokens.xxl + tokens.sm),
                        FadeSlideIn(
                          index: 1,
                          offset: 16,
                          child: Semantics(
                            header: true,
                            child: Text(
                              title,
                              style: text.headlineMedium?.copyWith(
                                color: tokens.fg,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -0.5,
                                height: 1.15,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: tokens.sm),
                        FadeSlideIn(
                          index: 2,
                          offset: 14,
                          child: Text(
                            subtitle,
                            style: text.bodyLarge?.copyWith(
                              color: tokens.muted,
                              height: 1.5,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ),
                        SizedBox(height: tokens.xxl),
                        FadeSlideIn(index: 3, offset: 12, child: form),
                        SizedBox(height: tokens.xl),
                        FadeSlideIn(index: 4, offset: 10, child: footer),
                      ],
                    ),
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

/// Soft drifting light fields + fine grain so the dark base never feels flat.
class _AuthAtmosphere extends StatefulWidget {
  const _AuthAtmosphere();

  @override
  State<_AuthAtmosphere> createState() => _AuthAtmosphereState();
}

class _AuthAtmosphereState extends State<_AuthAtmosphere> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 14))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final reduced = MediaQuery.disableAnimationsOf(context);
    return Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: tokens.bg),
        if (reduced)
          CustomPaint(painter: _GlowPainter(tokens: tokens, t: 0.35))
        else
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => CustomPaint(
              painter: _GlowPainter(tokens: tokens, t: _controller.value),
            ),
          ),
        CustomPaint(painter: _GrainPainter(color: tokens.fg)),
      ],
    );
  }
}

class _GlowPainter extends CustomPainter {
  const _GlowPainter({required this.tokens, required this.t});

  final AppTokens tokens;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final drift = (t - 0.5) * 48;
    final top = Offset(size.width * 0.18 + drift, size.height * -0.05);
    final bottom = Offset(size.width * 0.88 - drift * 0.6, size.height * 1.05);

    final glowA = Paint()
      ..shader = RadialGradient(
        colors: [
          tokens.primary.withValues(alpha: 0.07),
          tokens.primary.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: top, radius: size.shortestSide * 0.95));
    canvas.drawCircle(top, size.shortestSide * 0.95, glowA);

    final glowB = Paint()
      ..shader = RadialGradient(
        colors: [
          tokens.muted.withValues(alpha: 0.09),
          tokens.muted.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: bottom, radius: size.shortestSide * 0.85));
    canvas.drawCircle(bottom, size.shortestSide * 0.85, glowB);

    final wash = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          tokens.secondary.withValues(alpha: 0.04),
          const Color(0x00000000),
          tokens.surface.withValues(alpha: 0.55),
        ],
        stops: const [0, 0.45, 1],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, wash);
  }

  @override
  bool shouldRepaint(covariant _GlowPainter oldDelegate) => oldDelegate.t != t;
}

class _GrainPainter extends CustomPainter {
  const _GrainPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color.withValues(alpha: 0.018);
    final rng = math.Random(7);
    const step = 7.0;
    for (var y = 0.0; y < size.height; y += step) {
      for (var x = 0.0; x < size.width; x += step) {
        if (rng.nextDouble() > 0.62) {
          canvas.drawRect(Rect.fromLTWH(x + rng.nextDouble() * 2, y + rng.nextDouble() * 2, 1.1, 1.1), paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _GrainPainter oldDelegate) => oldDelegate.color != color;
}

/// Short ink bar that draws in under the brand — hierarchy without chrome.
class _BrandAccentBar extends StatelessWidget {
  const _BrandAccentBar();

  static const _width = 40.0;
  static const _height = 2.0;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    if (MediaQuery.disableAnimationsOf(context)) {
      return Container(width: _width, height: _height, color: tokens.primary);
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: AppMotion.slow + const Duration(milliseconds: 200),
      curve: AppMotion.emphasized,
      builder: (context, value, _) => Align(
        alignment: Alignment.centerLeft,
        child: SizedBox(
          width: _width * value,
          height: _height,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: tokens.primary,
              borderRadius: BorderRadius.circular(_height),
            ),
          ),
        ),
      ),
    );
  }
}

/// "Question? Action" row linking between auth screens.
class AuthSwitchLink extends StatelessWidget {
  const AuthSwitchLink({required this.prompt, required this.action, required this.onPressed, super.key});

  final String prompt;
  final String action;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: tokens.xs,
      children: [
        Text(prompt, style: text.bodyMedium?.copyWith(color: tokens.muted)),
        TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: tokens.fg,
            padding: EdgeInsets.symmetric(horizontal: tokens.sm, vertical: tokens.xs),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            action,
            style: text.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              decoration: TextDecoration.underline,
              decorationColor: tokens.border,
            ),
          ),
        ),
      ],
    );
  }
}
