import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../integrations/presentation/integration_oauth.dart';
import '../application/google_calendar_providers.dart';
import '../data/calendar_repository.dart';
import '../domain/google_calendar_connection.dart';
import '../domain/google_calendar_sync_types.dart';

class GoogleCalendarSettingsPanel extends ConsumerStatefulWidget {
  const GoogleCalendarSettingsPanel({super.key});

  @override
  ConsumerState<GoogleCalendarSettingsPanel> createState() => _GoogleCalendarSettingsPanelState();
}

class _GoogleCalendarSettingsPanelState extends ConsumerState<GoogleCalendarSettingsPanel> {
  var _busy = false;

  Future<void> _connect() async {
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      final url = await ref.read(calendarRepositoryProvider).beginGoogleCalendarConnect();
      final scheme = ref.read(appConfigProvider).deepLinkScheme;
      final result = await launchIntegrationOAuth(context, authorizeUrl: url, callbackScheme: scheme);
      if (result?.success == true) {
        ref.invalidate(googleCalendarConnectionProvider);
        if (mounted) showToast(context, l10n.calendarGoogleConnectedToast);
      } else if (result != null && !result.success && mounted) {
        showToast(context, l10n.calendarGoogleConnectFailed);
      }
    } catch (_) {
      if (mounted) showToast(context, l10n.calendarGoogleConnectFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _updateSettings({
    bool? defaultSyncNewEvents,
    GoogleCalendarSyncTypes? syncTypes,
  }) async {
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      await ref.read(calendarRepositoryProvider).updateGoogleCalendarSettings(
            defaultSyncNewEvents: defaultSyncNewEvents,
            syncTypes: syncTypes,
          );
      ref.invalidate(googleCalendarConnectionProvider);
      if (mounted) showToast(context, l10n.calendarGoogleSettingsSaved);
    } catch (_) {
      if (mounted) showToast(context, l10n.calendarGoogleSettingsFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _disconnect(GoogleCalendarConnection connection) async {
    final connectionId = connection.connectionId;
    if (connectionId == null) return;
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    try {
      await ref.read(calendarRepositoryProvider).disconnectGoogleCalendar(connectionId);
      ref.invalidate(googleCalendarConnectionProvider);
      if (mounted) showToast(context, l10n.calendarGoogleDisconnected);
    } catch (_) {
      if (mounted) showToast(context, l10n.calendarGoogleDisconnectFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final connection = ref.watch(googleCalendarConnectionProvider);
    return connection.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) => _Body(
        connection: data,
        busy: _busy,
        onConnect: _connect,
        onDisconnect: () => _disconnect(data),
        onUpdate: _updateSettings,
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.connection,
    required this.busy,
    required this.onConnect,
    required this.onDisconnect,
    required this.onUpdate,
  });

  final GoogleCalendarConnection connection;
  final bool busy;
  final VoidCallback onConnect;
  final VoidCallback onDisconnect;
  final void Function({bool? defaultSyncNewEvents, GoogleCalendarSyncTypes? syncTypes}) onUpdate;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;

    if (!connection.oauthConfigured && !connection.isConnected) {
      return Text(
        l10n.calendarGoogleNotConfigured,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
      );
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(tokens.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.calendarGoogleTitle, style: Theme.of(context).textTheme.titleSmall),
            SizedBox(height: tokens.xs),
            Text(
              connection.isConnected ? l10n.calendarGoogleConnected : l10n.calendarGoogleDisconnectedLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
            ),
            Text(
              l10n.calendarGoogleSettingsHint,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
            ),
            PermissionGate(
              anyOf: const [Permissions.calendarSync],
              child: Padding(
                padding: EdgeInsets.only(top: tokens.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (!connection.isConnected && connection.status != 'DISABLED')
                      FilledButton(onPressed: busy ? null : onConnect, child: Text(l10n.calendarGoogleConnect)),
                    if (connection.isConnected) ...[
                      Text(l10n.calendarGoogleSyncTypesHeading, style: Theme.of(context).textTheme.labelLarge),
                      _TypeToggle(
                        label: l10n.calendarGoogleSyncMeetings,
                        value: connection.syncTypes.meetings,
                        busy: busy,
                        onChanged: (v) => onUpdate(syncTypes: connection.syncTypes.copyWith(meetings: v)),
                      ),
                      _TypeToggle(
                        label: l10n.calendarGoogleSyncShoots,
                        value: connection.syncTypes.shoots,
                        busy: busy,
                        onChanged: (v) => onUpdate(syncTypes: connection.syncTypes.copyWith(shoots: v)),
                      ),
                      _TypeToggle(
                        label: l10n.calendarGoogleSyncTasks,
                        value: connection.syncTypes.tasks,
                        busy: busy,
                        onChanged: (v) => onUpdate(syncTypes: connection.syncTypes.copyWith(tasks: v)),
                      ),
                      _TypeToggle(
                        label: l10n.calendarGoogleSyncPosts,
                        value: connection.syncTypes.posts,
                        busy: busy,
                        onChanged: (v) => onUpdate(syncTypes: connection.syncTypes.copyWith(posts: v)),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(l10n.calendarGoogleDefaultNew, style: Theme.of(context).textTheme.bodySmall),
                        value: connection.defaultSyncNewEvents,
                        onChanged: busy ? null : (v) => onUpdate(defaultSyncNewEvents: v),
                      ),
                      OutlinedButton(onPressed: busy ? null : onDisconnect, child: Text(l10n.calendarGoogleDisconnect)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeToggle extends StatelessWidget {
  const _TypeToggle({
    required this.label,
    required this.value,
    required this.busy,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final bool busy;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label, style: Theme.of(context).textTheme.bodySmall),
      value: value,
      onChanged: busy ? null : onChanged,
    );
  }
}
