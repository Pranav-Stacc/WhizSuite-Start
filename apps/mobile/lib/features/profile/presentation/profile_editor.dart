import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/error_message.dart';
import '../../../l10n/app_localizations.dart';
import '../data/profile_repository.dart';
import '../domain/profile.dart';

Future<void> showProfileEditor(BuildContext context, Profile profile) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ProfileEditor(profile: profile),
    );

class _ProfileEditor extends ConsumerStatefulWidget {
  const _ProfileEditor({required this.profile});

  final Profile profile;

  @override
  ConsumerState<_ProfileEditor> createState() => _ProfileEditorState();
}

class _ProfileEditorState extends ConsumerState<_ProfileEditor> {
  final _formKey = GlobalKey<FormState>();
  late final _firstName = TextEditingController(text: widget.profile.firstName);
  late final _lastName = TextEditingController(text: widget.profile.lastName);
  late final _jobTitle = TextEditingController(text: widget.profile.jobTitle);
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _jobTitle.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(profileRepositoryProvider).update(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            jobTitle: _jobTitle.text.trim(),
          );
      ref.invalidate(profileProvider);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final validators = Validators(l10n);
    return Padding(
      padding: EdgeInsets.fromLTRB(tokens.lg, 0, tokens.lg, MediaQuery.viewInsetsOf(context).bottom + tokens.lg),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.settingsProfile, style: Theme.of(context).textTheme.titleLarge),
            SizedBox(height: tokens.lg),
            if (_error != null) ...[
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              SizedBox(height: tokens.md),
            ],
            TextFormField(
              controller: _firstName,
              maxLength: profileNameMaxLength,
              validator: validators.required,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.authFirstName),
            ),
            SizedBox(height: tokens.sm),
            TextFormField(
              controller: _lastName,
              maxLength: profileNameMaxLength,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.authLastName),
            ),
            SizedBox(height: tokens.sm),
            TextFormField(
              controller: _jobTitle,
              maxLength: profileJobTitleMaxLength,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _save(),
              decoration: InputDecoration(labelText: l10n.profileJobTitle),
            ),
            SizedBox(height: tokens.lg),
            PrimaryButton(label: l10n.save, loading: _saving, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
