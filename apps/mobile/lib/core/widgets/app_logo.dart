import 'package:flutter/material.dart';

import '../brand/app_brand.dart';

enum AppLogoVariant { primary, symbol, withName }

/// Renders WhizSuite brand marks from the official logo assets.
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.variant = AppLogoVariant.symbol,
    this.height = AppBrand.primaryLogoHeight,
    this.size = AppBrand.symbolLogoSize,
    this.name,
    this.semanticLabel,
    this.framed = true,
  });

  const AppLogo.primary({super.key, double size = AppBrand.symbolLogoSize, String? semanticLabel})
      : variant = AppLogoVariant.symbol,
        height = AppBrand.primaryLogoHeight,
        size = size,
        name = null,
        semanticLabel = semanticLabel,
        framed = true;

  const AppLogo.symbol({
    super.key,
    double size = AppBrand.symbolLogoSize,
    String? semanticLabel,
    bool framed = true,
  })  : variant = AppLogoVariant.symbol,
        height = AppBrand.primaryLogoHeight,
        size = size,
        name = null,
        semanticLabel = semanticLabel,
        framed = framed;

  /// Symbol without the navy tile (splash / full-bleed backgrounds).
  const AppLogo.symbolBare({super.key, double size = AppBrand.symbolLogoSize, String? semanticLabel})
      : variant = AppLogoVariant.symbol,
        height = AppBrand.primaryLogoHeight,
        size = size,
        name = null,
        semanticLabel = semanticLabel,
        framed = false;

  const AppLogo.withName({super.key, required String name, double size = AppBrand.symbolLogoSize, String? semanticLabel})
      : variant = AppLogoVariant.withName,
        height = AppBrand.primaryLogoHeight,
        size = size,
        this.name = name,
        semanticLabel = semanticLabel,
        framed = true;

  final AppLogoVariant variant;
  final double height;
  final double size;
  final String? name;
  final String? semanticLabel;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: switch (variant) {
        AppLogoVariant.primary => _SymbolLogo(size: size, framed: framed),
        AppLogoVariant.symbol => _SymbolLogo(size: size, framed: framed),
        AppLogoVariant.withName => _LogoWithName(name: name ?? '', size: size, framed: framed),
      },
    );
  }
}

class _BrandFrame extends StatelessWidget {
  const _BrandFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFF050B16),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Padding(padding: const EdgeInsets.all(4), child: child),
    );
  }
}

class _SymbolLogo extends StatelessWidget {
  const _SymbolLogo({required this.size, required this.framed});

  final double size;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      AppBrand.symbolLogo,
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
    return framed ? _BrandFrame(child: image) : image;
  }
}

class _LogoWithName extends StatelessWidget {
  const _LogoWithName({required this.name, required this.size, required this.framed});

  final String name;
  final double size;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme.titleSmall;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _SymbolLogo(size: size, framed: framed),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: text?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.2),
          ),
        ),
      ],
    );
  }
}
