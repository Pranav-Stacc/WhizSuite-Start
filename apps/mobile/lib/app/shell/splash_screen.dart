import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';

/// Shown while the stored session is restored from secure storage.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              AppLocalizations.of(context).appTitle.toUpperCase(),
              style: Theme.of(context).textTheme.labelLarge?.copyWith(letterSpacing: 3.2, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: tokens.lg),
            SizedBox(width: tokens.xxl * 2, child: const LinearProgressIndicator(minHeight: 1)),
          ],
        ),
      ),
    );
  }
}
