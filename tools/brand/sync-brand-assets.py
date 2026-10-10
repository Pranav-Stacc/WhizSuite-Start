#!/usr/bin/env python3
"""Copy WhizSuite brand files into web/mobile asset folders and regenerate launcher icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC_PRIMARY = Path.home() / 'Downloads' / 'PRIMARY LOGO 2.png'
SRC_SYMBOL = Path.home() / 'Downloads' / 'STANDALONE SYMBOL 1.png'


def main() -> None:
    if not SRC_PRIMARY.exists() or not SRC_SYMBOL.exists():
        raise SystemExit(f'Missing source logos in Downloads: {SRC_PRIMARY.name}, {SRC_SYMBOL.name}')

    web_brand = ROOT / 'apps/web/public/brand'
    mobile_brand = ROOT / 'apps/mobile/assets/brand'
    web_brand.mkdir(parents=True, exist_ok=True)
    mobile_brand.mkdir(parents=True, exist_ok=True)

    primary = Image.open(SRC_PRIMARY).convert('RGBA')
    symbol = Image.open(SRC_SYMBOL).convert('RGBA')

    for dest in [web_brand / 'logo-primary.png', mobile_brand / 'logo-primary.png']:
        primary.save(dest, optimize=True)
    for dest in [web_brand / 'logo-symbol.png', mobile_brand / 'logo-symbol.png']:
        symbol.save(dest, optimize=True)

    symbol.resize((512, 512), Image.Resampling.LANCZOS).save(mobile_brand / 'app-icon-512.png', optimize=True)

    android_res = ROOT / 'apps/mobile/android/app/src/main/res'
    for folder, size in {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }.items():
        symbol.resize((size, size), Image.Resampling.LANCZOS).save(android_res / folder / 'ic_launcher.png', optimize=True)

    ios_dir = ROOT / 'apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset'
    ios_icons = {
        'Icon-App-20x20@1x.png': 20,
        'Icon-App-20x20@2x.png': 40,
        'Icon-App-20x20@3x.png': 60,
        'Icon-App-29x29@1x.png': 29,
        'Icon-App-29x29@2x.png': 58,
        'Icon-App-29x29@3x.png': 87,
        'Icon-App-40x40@1x.png': 40,
        'Icon-App-40x40@2x.png': 80,
        'Icon-App-40x40@3x.png': 120,
        'Icon-App-60x60@2x.png': 120,
        'Icon-App-60x60@3x.png': 180,
        'Icon-App-76x76@1x.png': 76,
        'Icon-App-76x76@2x.png': 152,
        'Icon-App-83.5x83.5@2x.png': 167,
        'Icon-App-1024x1024@1x.png': 1024,
    }
    for name, size in ios_icons.items():
        symbol.resize((size, size), Image.Resampling.LANCZOS).save(ios_dir / name, optimize=True)

    web_icons = ROOT / 'apps/mobile/web'
    for name, size in [
        ('favicon.png', 32),
        ('icons/Icon-192.png', 192),
        ('icons/Icon-512.png', 512),
        ('icons/Icon-maskable-192.png', 192),
        ('icons/Icon-maskable-512.png', 512),
    ]:
        symbol.resize((size, size), Image.Resampling.LANCZOS).save(web_icons / name, optimize=True)

    symbol.resize((32, 32), Image.Resampling.LANCZOS).save(web_brand / 'favicon-32.png')
    symbol.resize((180, 180), Image.Resampling.LANCZOS).save(web_brand / 'apple-touch-icon.png')

    print('Synced brand assets from Downloads')


if __name__ == '__main__':
    main()
