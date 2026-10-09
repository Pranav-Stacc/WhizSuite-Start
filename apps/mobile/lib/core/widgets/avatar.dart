import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Hues avatars rotate through; same palette as the web `hueFor`.
const List<double> _avatarHues = [152, 190, 210, 262, 320, 24, 48, 100];
const int _hashMultiplier = 31;
const int _hashMask = 0xFFFFFFFF;

/// Stable hue for an id or name.
double hueFor(String seed) {
  var hash = 0;
  for (final unit in seed.codeUnits) {
    hash = (hash * _hashMultiplier + unit) & _hashMask;
  }
  return _avatarHues[hash % _avatarHues.length];
}

/// Accent colour derived from [seed], used for client marks and avatars.
Color seedColor(String seed) => HSLColor.fromAHSL(1, hueFor(seed), 0.55, 0.45).toColor();

String initialsOf(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
  return parts.map((p) => p.characters.first.toUpperCase()).join();
}

/// Circular initials avatar, or a rounded square [mark] for organisations/clients.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({required this.name, this.seed, this.size = 36, this.mark = false, this.color, super.key});

  final String name;
  final String? seed;
  final double size;
  final bool mark;
  final Color? color;

  static const _fontRatio = 0.38;
  static const _fillAlpha = 0.16;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final accent = color ?? seedColor(seed ?? name);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: accent.withValues(alpha: _fillAlpha),
          shape: mark ? BoxShape.rectangle : BoxShape.circle,
          borderRadius: mark ? BorderRadius.circular(tokens.radius + 6) : null,
          border: Border.all(color: accent.withValues(alpha: 0.35)),
        ),
        child: Text(
          initialsOf(name),
          style: TextStyle(color: accent, fontWeight: FontWeight.w600, fontSize: size * _fontRatio),
        ),
      ),
    );
  }
}
