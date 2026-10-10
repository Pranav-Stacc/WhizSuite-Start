import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../network/api_exception.dart';
import 'app_dialog.dart';
import 'error_message.dart';

/// Shows a single transient message, replacing any visible one.
void showToast(BuildContext context, String message, {SnackBarAction? action}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message), action: action));
}

/// Runs a mutation, toasting [success] on completion or the localized failure otherwise.
/// Returns whether it succeeded so callers can close sheets or refresh.
Future<bool> runAction(BuildContext context, Future<void> Function() action, {String? success}) async {
  final l10n = AppLocalizations.of(context);
  try {
    await action();
    if (success != null && context.mounted) showToast(context, success);
    return true;
  } on ApiException catch (error) {
    if (context.mounted) showToast(context, describeError(l10n, error));
    return false;
  }
}

/// Confirmation dialog; destructive actions use the error colour for the confirm button.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  String? body,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final l10n = AppLocalizations.of(context);
  final scheme = Theme.of(context).colorScheme;
  final confirmed = await showAppDialog<bool>(
    context,
    size: AppDialogSize.compact,
    builder: (ctx) => AppDialog(
      title: title,
      size: AppDialogSize.compact,
      scrollable: false,
      actions: [
        OutlinedButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(l10n.cancel)),
        FilledButton(
          style: destructive
              ? FilledButton.styleFrom(backgroundColor: scheme.error, foregroundColor: scheme.onError)
              : null,
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel),
        ),
      ],
      child: body == null ? null : Text(body),
    ),
  );
  return confirmed ?? false;
}
