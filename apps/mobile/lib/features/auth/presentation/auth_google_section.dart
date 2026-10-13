import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/error_message.dart';
import '../../../l10n/app_localizations.dart';

/// Divider + Google button shown below email/password actions on auth screens.
class AuthGoogleSection extends StatelessWidget {
  const AuthGoogleSection({
    required this.onPressed,
    required this.loading,
    required this.enabled,
    super.key,
  });

  final VoidCallback? onPressed;
  final bool loading;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(height: tokens.xl),
        _AuthOrDivider(label: l10n.authOrEmail),
        SizedBox(height: tokens.lg),
        OutlinedButton.icon(
          onPressed: onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: tokens.fg,
            side: BorderSide(color: tokens.border),
            backgroundColor: tokens.surface.withValues(alpha: 0.55),
            minimumSize: const Size(64, 48),
            textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          icon: loading
              ? SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: tokens.primary),
                )
              : Icon(Icons.g_mobiledata_rounded, size: 22, color: tokens.secondary),
          label: Text(l10n.authGoogleButton),
        ),
      ],
    );
  }
}

String googleAuthErrorMessage(AppLocalizations l10n, ApiException error) {
  if (error.detail == 'cancelled') return l10n.authGoogleCancelled;
  if (error.code == ErrorCodes.googleAuthDisabled) return l10n.authGoogleDisabled;
  if (error.detail == 'no_session' || error.kind == ApiFailureKind.notFound) {
    return l10n.authGoogleNoAccount;
  }
  if (error.kind == ApiFailureKind.unauthorized) return l10n.authGoogleInvalid;
  if (error.detail?.isNotEmpty == true) return error.detail!;
  return describeError(l10n, error);
}

class _AuthOrDivider extends StatelessWidget {
  const _AuthOrDivider({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: tokens.muted,
          letterSpacing: 1.4,
          fontWeight: FontWeight.w500,
        );
    return Row(
      children: [
        Expanded(child: Divider(color: tokens.border, height: 1)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.md),
          child: Text(label.toUpperCase(), style: style),
        ),
        Expanded(child: Divider(color: tokens.border, height: 1)),
      ],
    );
  }
}
