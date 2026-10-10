import 'package:flutter/material.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../l10n/app_localizations.dart';

/// Explains how notifications are personalized before the OS permission prompt.
Future<bool?> showNotificationPermissionPrimer(BuildContext context) {
  final l10n = AppLocalizations.of(context);
  final tokens = context.tokens;
  final text = Theme.of(context).textTheme;

  return showAppDialog<bool>(
    context,
    barrierDismissible: false,
    size: AppDialogSize.standard,
    builder: (ctx) => AppDialog(
      title: l10n.notificationPrimerTitle,
      subtitle: l10n.notificationPrimerSubtitle,
      size: AppDialogSize.standard,
      onClose: () => Navigator.of(ctx).pop(false),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(l10n.notificationPrimerNotNow),
        ),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(l10n.notificationPrimerEnable),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (icon, body) in [
            (Icons.assignment_outlined, l10n.notificationPrimerBulletTasks),
            (Icons.fact_check_outlined, l10n.notificationPrimerBulletApprovals),
            (Icons.event_outlined, l10n.notificationPrimerBulletCalendar),
            (Icons.tune_outlined, l10n.notificationPrimerBulletPreferences),
          ])
            Padding(
              padding: EdgeInsets.only(bottom: tokens.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 22, color: tokens.primary),
                  SizedBox(width: tokens.md),
                  Expanded(child: Text(body, style: text.bodyMedium)),
                ],
              ),
            ),
          SizedBox(height: tokens.sm),
          Text(
            l10n.notificationPrimerFootnote,
            style: text.bodySmall?.copyWith(color: tokens.muted),
          ),
        ],
      ),
    ),
  );
}
