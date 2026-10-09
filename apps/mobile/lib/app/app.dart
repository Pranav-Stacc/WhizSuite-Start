import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../core/theme/app_tokens.dart';
import '../core/theme/theme_controller.dart';
import '../l10n/app_localizations.dart';
import 'router/app_router.dart';

class AgencyOsApp extends ConsumerWidget {
  const AgencyOsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = buildAppTheme(ref.watch(themeControllerProvider));
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      debugShowCheckedModeBanner: false,
      theme: theme,
      themeAnimationDuration: AppMotion.medium,
      themeAnimationCurve: AppMotion.standard,
      routerConfig: ref.watch(routerProvider),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
