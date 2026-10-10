import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/password_field.dart';
import '../../../l10n/app_localizations.dart';
import '../../../core/config/app_config.dart';
import '../application/session_controller.dart';
import '../data/google_sign_in_service.dart';
import '../../../core/widgets/forms.dart';
import 'auth_layout.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;
  bool _googleSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).signIn(email: _email.text.trim(), password: _password.text);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.kind == ApiFailureKind.unauthorized ? l10n.authLoginInvalid : describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitGoogle() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _googleSubmitting = true;
      _error = null;
    });
    try {
      final idToken = await ref.read(googleSignInServiceProvider).obtainIdToken();
      await ref.read(sessionProvider.notifier).signInWithGoogle(idToken: idToken);
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.detail == 'cancelled') {
        setState(() => _error = l10n.authGoogleCancelled);
      } else if (error.kind == ApiFailureKind.notFound) {
        setState(() => _error = l10n.authGoogleNoAccount);
      } else if (error.kind == ApiFailureKind.unauthorized) {
        setState(() => _error = l10n.authGoogleInvalid);
      } else {
        setState(() => _error = describeError(l10n, error));
      }
    } finally {
      if (mounted) setState(() => _googleSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final validators = Validators(l10n);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final googleEnabled = ref.watch(appConfigProvider).googleSignInEnabled;
    final busy = _submitting || _googleSubmitting;
    final fieldGap = SizedBox(height: tokens.lg);

    return AuthLayout(
      title: l10n.authLoginTitle,
      subtitle: l10n.authLoginSubtitle,
      form: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FormErrorBanner(message: _error),
            if (googleEnabled) ...[
              OutlinedButton.icon(
                onPressed: busy ? null : _submitGoogle,
                style: OutlinedButton.styleFrom(
                  foregroundColor: tokens.fg,
                  side: BorderSide(color: tokens.border),
                  backgroundColor: tokens.surface.withValues(alpha: 0.55),
                  minimumSize: const Size(64, 52),
                  textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                ),
                icon: _googleSubmitting
                    ? SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: tokens.primary),
                      )
                    : Icon(Icons.g_mobiledata_rounded, size: 22, color: tokens.secondary),
                label: Text(l10n.authGoogleButton),
              ),
              SizedBox(height: tokens.xl),
              _AuthOrDivider(label: l10n.authOrEmail),
              SizedBox(height: tokens.xl),
            ],
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email, AutofillHints.username],
              textInputAction: TextInputAction.next,
              validator: validators.email,
              style: text.bodyLarge?.copyWith(color: tokens.fg),
              decoration: InputDecoration(
                labelText: l10n.authEmail,
                hintText: l10n.authEmailPlaceholder,
                contentPadding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md + 2),
              ),
            ),
            fieldGap,
            PasswordField(
              controller: _password,
              label: l10n.authPassword,
              validator: validators.required,
              onSubmitted: (_) => _submit(),
            ),
            SizedBox(height: tokens.xl + tokens.sm),
            PrimaryButton(
              label: l10n.authLoginSubmit,
              loading: _submitting,
              onPressed: busy ? null : _submit,
              icon: Icons.arrow_forward_rounded,
            ),
          ],
        ),
      ),
      footer: AuthSwitchLink(
        prompt: l10n.authNoAccount,
        action: l10n.authCreateWorkspace,
        onPressed: () => context.push(AppRoutes.register),
      ),
    );
  }
}

/// Hairline rule with centered label — quieter than a card divider.
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
