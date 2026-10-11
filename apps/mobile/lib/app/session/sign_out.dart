import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/widgets/feedback.dart';
import '../../features/auth/application/session_controller.dart';
import '../../features/notifications/application/notification_delivery.dart';
import '../../l10n/app_localizations.dart';

/// Ends the session on this device: stops realtime, unregisters the push device, revokes tokens.
final signOutProvider = Provider<Future<void> Function()>((ref) {
  return () async {
    try {
      await ref.read(notificationDeliveryProvider).stop();
    } on ApiException {
      // Device cleanup is best effort; the server prunes stale push tokens on delivery.
    }
    await ref.read(sessionProvider.notifier).signOut();
  };
});

/// Prompts for confirmation and signs out.
Future<void> confirmSignOut(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context);
  final confirmed = await confirmAction(
    context,
    title: l10n.settingsSignOut,
    body: l10n.settingsSignOutConfirm,
    confirmLabel: l10n.settingsSignOut,
  );
  if (confirmed) {
    await ref.read(signOutProvider)();
  }
}
