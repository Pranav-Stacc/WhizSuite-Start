import 'package:flutter/painting.dart';

/// WhizSuite brand asset paths and layout constants from the official logo files.
abstract final class AppBrand {
  /// Native splash + in-app boot screen (matches logo chrome in [AppLogo]).
  static const splashBackground = Color(0xFF050B16);

  /// Standalone symbol size on splash / [BrandLoader].
  static const splashSymbolSize = 72.0;
  /// `PRIMARY LOGO 2.png` — full wordmark (symbol + Whiz + suite).
  static const primaryLogo = 'assets/brand/logo-primary.png';

  /// `STANDALONE SYMBOL 1.png` — square mark for icons and compact chrome.
  static const symbolLogo = 'assets/brand/logo-symbol.png';

  /// Official primary logo dimensions (1774×887).
  static const primaryAspectRatio = 1774 / 887;

  /// Standalone symbol is square (1254×1254).
  static const symbolAspectRatio = 1.0;

  /// Recommended header height for the full wordmark.
  static const primaryLogoHeight = 32.0;

  /// Recommended size for the standalone symbol in navigation chrome.
  static const symbolLogoSize = 28.0;
}
