import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/navigation/app_routes.dart';
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final validators = Validators(l10n);
    final tokens = context.tokens;
    final gap = SizedBox(height: tokens.lg);
    return AuthLayout(
      title: l10n.authRegisterTitle,
      subtitle: l10n.authRegisterSubtitle,
      form: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FormErrorBanner(message: _error),
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
            ),
            gap,
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
              textInputAction: TextInputAction.done,
              onChanged: (_) => _slugEdited = true,
              onFieldSubmitted: (_) => _submit(),
              validator: validators.matches(_slugPattern, l10n.validationSlug),
              decoration: InputDecoration(labelText: l10n.authSlug, helperText: l10n.authSlugHint),
            ),
            SizedBox(height: tokens.xl),
            PrimaryButton(label: l10n.authRegisterSubmit, loading: _submitting, onPressed: _submit, icon: Icons.arrow_forward),
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
