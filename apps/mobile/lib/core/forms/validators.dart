import '../../l10n/app_localizations.dart';

typedef Validator = String? Function(String? value);

/// Form validators with localized messages. Limits come from `packages/contracts`.
class Validators {
  const Validators(this._l10n);

  static final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  final AppLocalizations _l10n;

  String? required(String? value) => (value == null || value.trim().isEmpty) ? _l10n.validationRequired : null;

  String? email(String? value) => required(value) ?? (_email.hasMatch(value!.trim()) ? null : _l10n.validationEmail);

  Validator minLength(int min) =>
      (value) => required(value) ?? (value!.trim().length < min ? _l10n.validationMinLength(min) : null);

  Validator matches(RegExp pattern, String message) =>
      (value) => required(value) ?? (pattern.hasMatch(value!.trim()) ? null : message);
}
