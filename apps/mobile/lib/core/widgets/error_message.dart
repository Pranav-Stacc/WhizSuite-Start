import '../../l10n/app_localizations.dart';
import '../network/api_exception.dart';

/// User-facing copy for any failure; never exposes raw exception text.
String describeError(AppLocalizations l10n, Object error) {
  if (error is! ApiException) return l10n.errorUnknown;
  return switch (error.kind) {
    ApiFailureKind.offline => l10n.errorOffline,
    ApiFailureKind.timeout => l10n.errorTimeout,
    ApiFailureKind.unauthorized => l10n.errorUnauthorized,
    ApiFailureKind.forbidden => l10n.errorForbidden,
    ApiFailureKind.notFound => l10n.errorNotFound,
    ApiFailureKind.conflict => l10n.errorConflict,
    ApiFailureKind.validation => error.detail ?? l10n.errorValidation,
    ApiFailureKind.rateLimited => l10n.errorRateLimited,
    ApiFailureKind.server => l10n.errorServer,
    ApiFailureKind.unknown => l10n.errorUnknown,
  };
}
