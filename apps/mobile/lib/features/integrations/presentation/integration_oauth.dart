import 'package:flutter/material.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import '../../../core/config/app_config.dart';
import '../../../l10n/app_localizations.dart';
import '../../../core/widgets/feedback.dart';

/// Result of an OAuth round-trip back into the app.
class IntegrationOAuthResult {
  const IntegrationOAuthResult({
    required this.success,
    this.clientId,
    this.reason,
  });

  final bool success;
  final String? clientId;
  final String? reason;

  factory IntegrationOAuthResult.fromUri(Uri uri) {
    final meta = uri.queryParameters['meta'];
    return IntegrationOAuthResult(
      success: meta == 'connected',
      clientId: uri.queryParameters['client'],
      reason: uri.queryParameters['reason'],
    );
  }
}

/// Opens Meta OAuth in a secure browser tab and waits for the mobile deep-link callback.
Future<IntegrationOAuthResult?> launchMetaOAuth(
  BuildContext context, {
  required String authorizeUrl,
  required String callbackScheme,
}) async {
  final l10n = AppLocalizations.of(context);
  try {
    final callback = await FlutterWebAuth2.authenticate(
      url: authorizeUrl,
      callbackUrlScheme: callbackScheme,
    );
    if (!context.mounted) return null;
    return IntegrationOAuthResult.fromUri(Uri.parse(callback));
  } catch (e) {
    if (e.toString().toLowerCase().contains('cancel')) return null;
    if (context.mounted) showToast(context, l10n.integrationOAuthFailed);
    return null;
  }
}

/// Shows success/error toasts after OAuth and returns whether it succeeded.
bool handleIntegrationOAuthResult(BuildContext context, IntegrationOAuthResult? result) {
  if (result == null) return false;
  final l10n = AppLocalizations.of(context);
  if (result.success) {
    showToast(context, l10n.integrationMetaConnected);
    return true;
  }
  final reason = result.reason;
  showToast(
    context,
    reason == null || reason.isEmpty ? l10n.integrationMetaFailed : l10n.integrationMetaFailedReason(reason),
  );
  return false;
}

String oauthCallbackScheme(AppConfig config) => config.deepLinkScheme;
