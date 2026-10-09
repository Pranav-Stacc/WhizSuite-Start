import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../l10n/app_localizations.dart';

/// Editorial frame shared by sign-in and registration: eyebrow, headline, form, footer link.
class AuthLayout extends StatelessWidget {
  const AuthLayout({required this.title, required this.subtitle, required this.form, required this.footer, super.key});

  static const _maxWidth = 440.0;

  final String title;
  final String subtitle;
  final Widget form;
  final Widget footer;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: tokens.xl, vertical: tokens.xxl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxWidth),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FadeSlideIn(
                      child: Text(
                        l10n.authHeroEyebrow.toUpperCase(),
                        style: text.labelSmall?.copyWith(letterSpacing: 2.4, fontWeight: FontWeight.w600),
                      ),
                    ),
                    SizedBox(height: tokens.lg),
                    FadeSlideIn(
                      index: 1,
                      child: Semantics(
                        header: true,
                        child: Text(title, style: text.headlineMedium),
                      ),
                    ),
                    SizedBox(height: tokens.sm),
                    FadeSlideIn(
                      index: 2,
                      child: Text(subtitle, style: text.bodyLarge?.copyWith(color: tokens.muted)),
                    ),
                    SizedBox(height: tokens.xl),
                    Divider(color: tokens.border),
                    SizedBox(height: tokens.xl),
                    FadeSlideIn(index: 3, child: form),
                    SizedBox(height: tokens.xl),
                    FadeSlideIn(index: 4, child: footer),
                  ],
                ),
              ),
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
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(prompt, style: TextStyle(color: tokens.muted)),
        TextButton(
          onPressed: onPressed,
          child: Text(action, style: const TextStyle(fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
        ),
      ],
    );
  }
}
