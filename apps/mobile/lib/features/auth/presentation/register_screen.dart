import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
import '../../../core/config/app_config.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/password_field.dart';
import '../../../l10n/app_localizations.dart';
import '../application/session_controller.dart';
import '../data/auth_repository.dart';
import '../data/google_sign_in_service.dart';
import '../../../core/widgets/forms.dart';
import 'auth_layout.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  static final _slugPattern = RegExp(organizationSlugPattern);
  static final _slugInvalidChars = RegExp('[^a-z0-9-]+');

  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _organization = TextEditingController();
  final _slug = TextEditingController();
  bool _slugEdited = false;
  bool _submitting = false;
  bool _googleSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _organization.addListener(_suggestSlug);
  }

  @override
  void dispose() {
    for (final controller in [_firstName, _lastName, _email, _password, _organization, _slug]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _suggestSlug() {
    if (_slugEdited) return;
    _slug.text = _organization.text.trim().toLowerCase().replaceAll(_slugInvalidChars, '-').replaceAll(RegExp('^-+|-+\$'), '');
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).register(
            RegistrationInput(
              email: _email.text.trim(),
              password: _password.text,
              firstName: _firstName.text.trim(),
              lastName: _lastName.text.trim(),
              organizationName: _organization.text.trim(),
              organizationSlug: _slug.text.trim().toLowerCase(),
            ),
          );
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.kind == ApiFailureKind.conflict ? l10n.authRegisterExists : describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitGoogle() async {
    final l10n = AppLocalizations.of(context);
    final org = _organization.text.trim();
    final slug = _slug.text.trim().toLowerCase();
    if (org.length < organizationNameMinLength || !_slugPattern.hasMatch(slug)) {
      setState(() => _error = l10n.authGoogleWorkspaceRequired);
      return;
    }
    setState(() {
      _googleSubmitting = true;
      _error = null;
    });
    try {
      final idToken = await ref.read(googleSignInServiceProvider).obtainIdToken();
      await ref.read(sessionProvider.notifier).signInWithGoogle(
            idToken: idToken,
            organizationName: org,
            organizationSlug: slug,
          );
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.detail == 'cancelled') {
        setState(() => _error = l10n.authGoogleCancelled);
      } else if (error.kind == ApiFailureKind.conflict) {
        setState(() => _error = l10n.authRegisterExists);
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
    final gap = SizedBox(height: tokens.lg);
    final googleEnabled = ref.watch(appConfigProvider).googleSignInEnabled;
    final busy = _submitting || _googleSubmitting;
    return AuthLayout(
      title: l10n.authRegisterTitle,
      subtitle: l10n.authRegisterSubtitle,
      form: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FormErrorBanner(message: _error),
            TextFormField(
              controller: _organization,
              autofillHints: const [AutofillHints.organizationName],
              textInputAction: TextInputAction.next,
              validator: validators.minLength(organizationNameMinLength),
              decoration: InputDecoration(labelText: l10n.authOrganization),
            ),
            gap,
            TextFormField(
              controller: _slug,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _slugEdited = true,
              validator: validators.matches(_slugPattern, l10n.validationSlug),
              decoration: InputDecoration(labelText: l10n.authSlug, helperText: l10n.authSlugHint),
            ),
            if (googleEnabled) ...[
              gap,
              OutlinedButton.icon(
                onPressed: busy ? null : _submitGoogle,
                icon: _googleSubmitting
                    ? SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Theme.of(context).colorScheme.primary),
                      )
                    : const Icon(Icons.g_mobiledata_rounded),
                label: Text(l10n.authGoogleButton),
              ),
              gap,
              Text(
                l10n.authOrEmail,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            gap,
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstName,
                    autofillHints: const [AutofillHints.givenName],
                    textInputAction: TextInputAction.next,
                    maxLength: profileNameMaxLength,
                    buildCounter: _noCounter,
                    validator: validators.required,
                    decoration: InputDecoration(labelText: l10n.authFirstName),
                  ),
                ),
                SizedBox(width: tokens.md),
                Expanded(
                  child: TextFormField(
                    controller: _lastName,
                    autofillHints: const [AutofillHints.familyName],
                    textInputAction: TextInputAction.next,
                    maxLength: profileNameMaxLength,
                    buildCounter: _noCounter,
                    decoration: InputDecoration(labelText: l10n.authLastName),
                  ),
                ),
              ],
            ),
            gap,
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              validator: validators.email,
              decoration: InputDecoration(labelText: l10n.authEmail, hintText: l10n.authEmailPlaceholder),
            ),
            gap,
            PasswordField(
              controller: _password,
              label: l10n.authRegisterPassword(passwordMinLength),
              autofillHints: const [AutofillHints.newPassword],
              validator: validators.minLength(passwordMinLength),
              onSubmitted: (_) => _submit(),
            ),
            SizedBox(height: tokens.xl),
            PrimaryButton(
              label: l10n.authRegisterSubmit,
              loading: _submitting,
              onPressed: busy ? null : _submit,
              icon: Icons.arrow_forward,
            ),
          ],
        ),
      ),
      footer: AuthSwitchLink(
        prompt: l10n.authHaveAccount,
        action: l10n.authSignIn,
        onPressed: () => context.go(AppRoutes.login),
      ),
    );
  }

  static Widget? _noCounter(BuildContext context, {required int currentLength, required bool isFocused, int? maxLength}) =>
      null;
}
