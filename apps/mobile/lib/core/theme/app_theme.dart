import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_tokens.dart';
import 'theme_settings.dart';

/// Builds Material theme data from the user's theme settings (same tokens as the web).
ThemeData buildAppTheme(ThemeSettings settings) {
  final tokens = AppTokens.from(settings);
  final brightness = settings.isLight ? Brightness.light : Brightness.dark;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: settings.primary,
    onPrimary: tokens.onPrimary,
    secondary: settings.secondary,
    onSecondary: contrastOn(settings.secondary),
    error: StatusColors.danger,
    onError: contrastOn(StatusColors.danger),
    surface: settings.surface,
    onSurface: settings.fg,
    onSurfaceVariant: settings.muted,
    outline: settings.border,
    outlineVariant: settings.border,
    surfaceContainerLowest: settings.bg,
    surfaceContainerLow: settings.bg,
    surfaceContainer: settings.surface,
    surfaceContainerHigh: tokens.subtle,
    surfaceContainerHighest: tokens.subtle,
  );

  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
  final textTheme = GoogleFonts.geistTextTheme(base.textTheme).apply(bodyColor: settings.fg, displayColor: settings.fg);
  final shape = RoundedRectangleBorder(borderRadius: tokens.borderRadius);
  final hairline = BorderSide(color: settings.border);
  final visualDensity = settings.density == ThemeDensity.compact ? VisualDensity.compact : VisualDensity.standard;

  return base.copyWith(
    scaffoldBackgroundColor: settings.bg,
    canvasColor: settings.bg,
    visualDensity: visualDensity,
    textTheme: textTheme.copyWith(
      headlineMedium: textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.6),
      titleLarge: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.3),
      titleMedium: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      bodySmall: textTheme.bodySmall?.copyWith(color: settings.muted),
      labelSmall: textTheme.labelSmall?.copyWith(color: settings.muted, letterSpacing: 0.6),
    ),
    extensions: [tokens],
    dividerTheme: DividerThemeData(color: settings.border, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: settings.bg,
      foregroundColor: settings.fg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.3),
      shape: Border(bottom: hairline),
    ),
    cardTheme: CardThemeData(
      color: settings.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: shape.copyWith(side: hairline),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: settings.secondary,
      textColor: settings.fg,
      shape: shape,
      dense: settings.density == ThemeDensity.compact,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: settings.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: settings.primary.withValues(alpha: 0.12),
      indicatorShape: shape,
      elevation: 0,
      labelTextStyle: WidgetStatePropertyAll(textTheme.labelSmall?.copyWith(color: settings.fg)),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(color: states.contains(WidgetState.selected) ? settings.primary : settings.muted),
      ),
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: settings.surface,
      indicatorColor: settings.primary.withValues(alpha: 0.12),
      indicatorShape: shape,
      selectedIconTheme: IconThemeData(color: settings.primary),
      unselectedIconTheme: IconThemeData(color: settings.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: settings.primary,
        foregroundColor: tokens.onPrimary,
        shape: shape,
        minimumSize: const Size(64, 48),
        textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: settings.fg,
        side: hairline,
        shape: shape,
        minimumSize: const Size(64, 48),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: settings.fg, shape: shape),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: settings.surface,
      contentPadding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
      labelStyle: TextStyle(color: settings.muted),
      hintStyle: TextStyle(color: settings.muted),
      border: OutlineInputBorder(borderRadius: tokens.borderRadius, borderSide: hairline),
      enabledBorder: OutlineInputBorder(borderRadius: tokens.borderRadius, borderSide: hairline),
      focusedBorder: OutlineInputBorder(
        borderRadius: tokens.borderRadius,
        borderSide: BorderSide(color: settings.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(borderRadius: tokens.borderRadius, borderSide: BorderSide(color: scheme.error)),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: tokens.borderRadius,
        borderSide: BorderSide(color: scheme.error, width: 1.5),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: tokens.subtle,
      selectedColor: settings.primary.withValues(alpha: 0.14),
      side: hairline,
      shape: shape,
      labelStyle: textTheme.labelMedium?.copyWith(color: settings.fg),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: settings.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: settings.border,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(tokens.radius + 8))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: settings.surface,
      surfaceTintColor: Colors.transparent,
      shape: shape.copyWith(side: hairline),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: settings.fg,
      contentTextStyle: textTheme.bodyMedium?.copyWith(color: settings.bg),
      shape: shape,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? tokens.onPrimary : settings.muted,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? settings.primary : tokens.subtle,
      ),
      trackOutlineColor: WidgetStatePropertyAll(settings.border),
    ),
    sliderTheme: SliderThemeData(
      activeTrackColor: settings.primary,
      inactiveTrackColor: settings.border,
      thumbColor: settings.primary,
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: settings.primary, linearTrackColor: settings.border),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
