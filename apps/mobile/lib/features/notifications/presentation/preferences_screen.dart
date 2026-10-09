import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../l10n/app_localizations.dart';
import '../application/preferences_controller.dart';
import '../domain/app_notification.dart';

class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final preferences = ref.watch(notificationPreferencesProvider);

    Future<void> toggle(String typeKey, String channel, bool enabled) async {
      try {
        await ref.read(notificationPreferencesProvider.notifier).setChannel(typeKey, channel, enabled);
      } on ApiException catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(describeError(l10n, error))));
        }
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(l10n.preferencesTitle)),
      body: AsyncValueView(
        value: preferences,
        onRetry: () => ref.invalidate(notificationPreferencesProvider),
        data: (items) => ListView(
          padding: EdgeInsets.all(tokens.lg),
          children: [
            Text(l10n.preferencesBody, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)),
            SizedBox(height: tokens.lg),
            for (final (index, preference) in items.indexed)
              FadeSlideIn(
                index: index,
                child: Padding(
                  padding: EdgeInsets.only(bottom: tokens.md),
                  child: _PreferenceCard(preference: preference, onChanged: toggle),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PreferenceCard extends StatelessWidget {
  const _PreferenceCard({required this.preference, required this.onChanged});

  final NotificationPreference preference;
  final void Function(String typeKey, String channel, bool enabled) onChanged;

  String _channelLabel(AppLocalizations l10n, String channel) => switch (channel) {
        NotificationChannels.inApp => l10n.channelInApp,
        NotificationChannels.email => l10n.channelEmail,
        NotificationChannels.push => l10n.channelPush,
        _ => channel,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Card(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: tokens.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(tokens.lg, tokens.sm, tokens.lg, 0),
              child: Text(
                notificationTypeLabel(l10n, preference.typeKey),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            for (final channel in NotificationChannels.values)
              SwitchListTile(
                title: Text(_channelLabel(l10n, channel)),
                value: preference.isOn(channel),
                onChanged: (enabled) => onChanged(preference.typeKey, channel, enabled),
              ),
          ],
        ),
      ),
    );
  }
}
