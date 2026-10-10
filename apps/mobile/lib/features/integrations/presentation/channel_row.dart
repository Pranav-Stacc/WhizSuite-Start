import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../content/presentation/content_labels.dart';
import '../application/integrations_controller.dart';
import '../domain/platform_channel.dart';
import 'connection_forms.dart';
import 'integration_oauth.dart';

class ChannelRow extends ConsumerStatefulWidget {
  const ChannelRow({
    required this.channel,
    required this.clientName,
    super.key,
  });

  final PlatformChannel channel;
  final String clientName;

  @override
  ConsumerState<ChannelRow> createState() => _ChannelRowState();
}

class _ChannelRowState extends ConsumerState<ChannelRow> {
  bool _busy = false;

  Future<void> _connectMeta() async {
    if (_busy) return;
    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context);
    final config = ref.read(appConfigProvider);
    final actions = ref.read(integrationsActionsProvider);
    try {
      final url = await actions.beginMetaOAuth(
        clientId: widget.channel.clientId,
        platform: widget.channel.platform,
      );
      final result = await launchMetaOAuth(
        context,
        authorizeUrl: url,
        callbackScheme: oauthCallbackScheme(config),
      );
      if (handleIntegrationOAuthResult(context, result)) {
        actions.refresh();
      }
    } catch (_) {
      if (mounted) showToast(context, l10n.integrationOAuthFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _connectDemo() async {
    final saved = await showChannelConnectForm(
      context,
      ref,
      channel: widget.channel,
      clientName: widget.clientName,
    );
    if (saved && mounted) {
      showToast(context, AppLocalizations.of(context).integrationConnectedToast(
        contentPlatformLabel(AppLocalizations.of(context), widget.channel.platform),
      ));
    }
  }

  Future<void> _disconnect() async {
    final l10n = AppLocalizations.of(context);
    final platform = contentPlatformLabel(l10n, widget.channel.platform);
    final confirmed = await confirmAction(
      context,
      title: l10n.integrationDisconnectTitle(platform),
      body: l10n.integrationDisconnectBody,
      confirmLabel: l10n.integrationDisconnect,
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await runAction(
        context,
        () => ref.read(integrationsActionsProvider).disconnectMeta(widget.channel.id),
        success: l10n.integrationDisconnectedToast(platform),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sync() async {
    ref.read(integrationsActionsProvider).refresh();
    if (mounted) showToast(context, AppLocalizations.of(context).integrationSynced);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final live = ref.watch(integrationsLiveModeProvider);
    final channel = widget.channel;
    final platformLabel = contentPlatformLabel(l10n, channel.platform);
    final useMetaOauth = live && channel.isMeta;

    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(contentPlatformIcon(channel.platform), size: 28, color: tokens.secondary),
          SizedBox(width: tokens.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(platformLabel, style: text.titleSmall),
                    if (channel.connected) ...[
                      SizedBox(width: tokens.sm),
                      StatusBadge(
                        label: l10n.integrationStatus(IntegrationConnectionStatuses.connected),
                        tone: StatusTone.success,
                        dense: true,
                      ),
                    ],
                  ],
                ),
                SizedBox(height: tokens.xs),
                Text(
                  channel.connected
                      ? l10n.integrationChannelMeta(
                          channel.handle.isEmpty ? l10n.valueUnknown : channel.handle,
                          channel.followers,
                          channel.lastSyncAt == null
                              ? l10n.integrationNeverSynced
                              : formats.relative(channel.lastSyncAt!),
                        )
                      : l10n.integrationChannelAvailable,
                  style: text.bodySmall?.copyWith(color: tokens.muted),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (_busy)
            const SizedBox.square(dimension: 24, child: CircularProgressIndicator(strokeWidth: 2))
          else if (channel.connected)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: l10n.integrationSync,
                  onPressed: _sync,
                  icon: const Icon(Icons.sync_outlined, size: 20),
                ),
                IconButton(
                  tooltip: l10n.integrationDisconnect,
                  onPressed: _disconnect,
                  icon: const Icon(Icons.link_off_outlined, size: 20),
                ),
              ],
            )
          else if (useMetaOauth)
            FilledButton.tonal(
              onPressed: _connectMeta,
              child: Text(l10n.integrationConnect),
            )
          else if (!live)
            FilledButton.tonal(
              onPressed: _connectDemo,
              child: Text(l10n.integrationConnect),
            )
          else
            Tooltip(
              message: l10n.integrationOAuthWebOnly,
              child: Icon(Icons.info_outline, size: 20, color: tokens.muted),
            ),
        ],
      ),
    );
  }
}
