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
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/password_field.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../application/session_controller.dart';
import '../data/auth_repository.dart';
import 'auth_layout.dart';

/// Public route `/invite?token=` — preview then redeem a staff invitation.
class InviteAcceptScreen extends ConsumerStatefulWidget {
  const InviteAcceptScreen({super.key, this.token});

  final String? token;

  @override
  ConsumerState<InviteAcceptScreen> createState() => _InviteAcceptScreenState();
}

class _InviteAcceptScreenState extends ConsumerState<InviteAcceptScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _password = TextEditingController();

  bool _loadingPreview = false;
  bool _submitting = false;
  bool _invalid = false;
  String? _email;
  String? _orgName;
  bool _hasAccount = false;
  String? _error;

  String get _token => (widget.token ?? '').trim();

  @override
  void initState() {
    super.initState();
    if (_token.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadPreview());
    } else {
      _invalid = true;
    }
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _loadPreview() async {
    setState(() {
      _loadingPreview = true;
      _error = null;
      _invalid = false;
    });
    try {
      final preview = await ref.read(authRepositoryProvider).previewInvitation(_token);
      if (!mounted) return;
      setState(() {
        _email = preview['email'] as String?;
        _orgName = preview['organizationName'] as String?;
        _hasAccount = preview['hasAccount'] == true;
        if (_email == null || _email!.isEmpty || _orgName == null || _orgName!.isEmpty) {
          _invalid = true;
        }
      });
    } on ApiException {
      if (!mounted) return;
      setState(() => _invalid = true);
    } finally {
      if (mounted) setState(() => _loadingPreview = false);
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).acceptInvitation(
            token: _token,
            password: _password.text,
            firstName: _hasAccount ? null : _firstName.text.trim(),
            lastName: _hasAccount ? null : _lastName.text.trim(),
          );
      if (mounted) context.go(AppRoutes.home);
    } on ApiException catch (error) {
      if (!mounted) return;
      final message = switch (error.kind) {
        ApiFailureKind.unauthorized => l10n.authInviteWrongPassword,
        ApiFailureKind.conflict => l10n.authInviteAlreadyMember,
        ApiFailureKind.validation || ApiFailureKind.notFound => l10n.authInviteInvalid,
        _ => describeError(l10n, error),
      };
      setState(() => _error = message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    if (_loadingPreview) {
      return Scaffold(
        body: Center(
          child: SizedBox.square(
            dimension: 32,
            child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary),
          ),
        ),
      );
    }

    if (_invalid) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(tokens.xl),
              child: FadeSlideIn(
                child: EmptyState(
                  icon: Icons.link_off_outlined,
                  title: l10n.authInviteInvalidTitle,
                  body: l10n.authInviteInvalid,
                  action: TextButton(
                    onPressed: () => context.go(AppRoutes.login),
                    child: Text(l10n.authSignIn),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final org = _orgName ?? l10n.appTitle;
    final email = _email ?? '';
    final validators = Validators(l10n);
    final gap = SizedBox(height: tokens.lg);

    return AuthLayout(
      title: l10n.authInviteTitle(org),
      subtitle: _hasAccount ? l10n.authInviteSubtitleExisting(email) : l10n.authInviteSubtitle(email),
      form: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FormErrorBanner(message: _error),
            FadeSlideIn(
              child: SurfaceCard(
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: tokens.primary.withValues(alpha: 0.12),
                      child: Icon(Icons.apartment_outlined, color: tokens.primary),
                    ),
                    SizedBox(width: tokens.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(org, style: Theme.of(context).textTheme.titleMedium),
                          Text(
                            email,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            gap,
            TextFormField(
              initialValue: email,
              readOnly: true,
              enabled: false,
              decoration: InputDecoration(
                labelText: l10n.authEmail,
                prefixIcon: const Icon(Icons.mail_outline),
              ),
            ),
            if (!_hasAccount) ...[
              gap,
              Text(
                l10n.authInviteSetPasswordHint,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
              ),
              gap,
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstName,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.givenName],
                      validator: validators.required,
                      decoration: InputDecoration(labelText: l10n.authFirstName),
                    ),
                  ),
                  SizedBox(width: tokens.md),
                  Expanded(
                    child: TextFormField(
                      controller: _lastName,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.familyName],
                      decoration: InputDecoration(labelText: l10n.authLastName),
                    ),
                  ),
                ],
              ),
            ],
            gap,
            PasswordField(
              controller: _password,
              label: l10n.authInvitePassword,
              autofillHints: _hasAccount
                  ? const [AutofillHints.password]
                  : const [AutofillHints.newPassword],
              validator: validators.minLength(passwordMinLength),
              onSubmitted: _submitting ? null : (_) => _submit(),
            ),
            gap,
            PrimaryButton(
              label: l10n.authInviteSubmit,
              loading: _submitting,
              onPressed: _submitting ? null : _submit,
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
}
