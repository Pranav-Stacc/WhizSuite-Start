import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../l10n/app_localizations.dart';
import '../application/notification_delivery.dart';
import '../application/preferences_controller.dart';
import '../domain/app_notification.dart';
import '../infrastructure/notification_permission_store.dart';
import '../infrastructure/push_messaging.dart';
import 'notification_permission_primer.dart';

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends ConsumerState<NotificationPreferencesScreen> {
  var _pushAuthorized = true;
  var _pushChecked = false;

  @override
  void initState() {
    super.initState();
    _refreshPushAuth();
  }

  Future<void> _refreshPushAuth() async {
    final push = ref.read(pushMessagingProvider);
    await push.prepare();
    final authorized = await push.isAuthorized();
    if (mounted) {
      setState(() {
        _pushChecked = true;
        _pushAuthorized = authorized;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final preferences = ref.watch(notificationPreferencesProvider);

    Future<void> toggle(String typeKey, String channel, bool enabled) async {
      if (channel == NotificationChannels.push && enabled && !_pushAuthorized) {
        final locale = Localizations.localeOf(context).toLanguageTag();
        final enable = await showNotificationPermissionPrimer(context);
        if (enable != true || !mounted) return;
        await ref.read(notificationPermissionStoreProvider).markPrimerCompleted();
        final granted = await ref.read(notificationDeliveryProvider).enablePush(locale: locale);
        if (!mounted) return;
        if (granted) {
          showToast(context, l10n.notificationPrimerEnable);
          await _refreshPushAuth();
        } else {
          return;
        }
      }
      try {
        await ref.read(notificationPreferencesProvider.notifier).setChannel(typeKey, channel, enabled);
      } on ApiException catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(describeError(l10n, error))));
        }
      }
    }

    final push = ref.watch(pushMessagingProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.preferencesTitle)),
      body: AsyncValueView(
        value: preferences,
        onRetry: () => ref.invalidate(notificationPreferencesProvider),
        data: (items) => ListView(
          padding: EdgeInsets.all(tokens.lg),
          children: [
            if (push.isSupported) _PushPermissionBanner(onEnabled: _refreshPushAuth),
            Text(l10n.preferencesBody, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted)),
            SizedBox(height: tokens.lg),
            for (final (index, preference) in items.indexed)
              FadeSlideIn(
                index: index,
                child: Padding(
                  padding: EdgeInsets.only(bottom: tokens.md),
                  child: _PreferenceCard(
                    preference: preference,
                    pushAuthorized: _pushChecked && _pushAuthorized,
                    onChanged: toggle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PushPermissionBanner extends ConsumerStatefulWidget {
  const _PushPermissionBanner({this.onEnabled});

  final VoidCallback? onEnabled;

  @override
  ConsumerState<_PushPermissionBanner> createState() => _PushPermissionBannerState();
}

class _PushPermissionBannerState extends ConsumerState<_PushPermissionBanner> {
  var _authorized = true;
  var _checked = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final push = ref.read(pushMessagingProvider);
    await push.prepare();
    final authorized = await push.isAuthorized();
    if (mounted) setState(() {
      _checked = true;
      _authorized = authorized;
    });
  }

  Future<void> _enable() async {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context).toLanguageTag();
    final enable = await showNotificationPermissionPrimer(context);
    if (enable != true || !mounted) {
      return;
    }
    await ref.read(notificationPermissionStoreProvider).markPrimerCompleted();
    final granted = await ref.read(notificationDeliveryProvider).enablePush(locale: locale);
    if (!mounted) return;
    if (granted) {
      showToast(context, l10n.notificationPrimerEnable);
      widget.onEnabled?.call();
    }
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked || _authorized) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return Padding(
      padding: EdgeInsets.only(bottom: tokens.lg),
      child: Card(
        child: Padding(
          padding: EdgeInsets.all(tokens.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.notificationPushDisabledTitle, style: Theme.of(context).textTheme.titleMedium),
              SizedBox(height: tokens.sm),
              Text(
                l10n.notificationPushDisabledBody,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
              ),
              SizedBox(height: tokens.md),
              FilledButton(onPressed: _enable, child: Text(l10n.notificationPushEnableAction)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PreferenceCard extends StatelessWidget {
  const _PreferenceCard({
    required this.preference,
    required this.onChanged,
    required this.pushAuthorized,
  });

  final NotificationPreference preference;
  final bool pushAuthorized;
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
                subtitle: channel == NotificationChannels.push && !pushAuthorized
                    ? Text(l10n.notificationPushDisabledBody, style: Theme.of(context).textTheme.bodySmall)
                    : null,
                value: preference.isOn(channel),
                onChanged: (enabled) => onChanged(preference.typeKey, channel, enabled),
              ),
          ],
        ),
      ),
    );
  }
}
