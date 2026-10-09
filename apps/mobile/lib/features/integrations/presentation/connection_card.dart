import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/integrations_controller.dart';
import '../domain/integration_connection.dart';
import 'connection_forms.dart';
import 'integration_labels.dart';

enum _ConnectionAction { edit, connect, disconnect }

class ConnectionCard extends ConsumerWidget {
  const ConnectionCard({required this.connection, this.clientName, super.key});

  final IntegrationConnection connection;
  final String? clientName;

  Future<void> _onAction(BuildContext context, WidgetRef ref, _ConnectionAction action) async {
    final l10n = AppLocalizations.of(context);
    final provider = integrationProviderLabel(l10n, connection);
    final actions = ref.read(integrationsActionsProvider);
    switch (action) {
      case _ConnectionAction.edit:
        final saved = await showConnectionEditForm(context, ref, connection);
        if (saved && context.mounted) showToast(context, l10n.savedToast);
      case _ConnectionAction.connect:
        await runAction(
          context,
          () => actions.setStatus(connection.id, IntegrationConnectionStatuses.connected),
          success: l10n.integrationConnectedToast(provider),
        );
      case _ConnectionAction.disconnect:
        final confirmed = await confirmAction(
          context,
          title: l10n.integrationDisconnectTitle(provider),
          body: l10n.integrationDisconnectBody,
          confirmLabel: l10n.integrationDisconnect,
          destructive: true,
        );
        if (!confirmed || !context.mounted) return;
        await runAction(
          context,
          () => actions.setStatus(connection.id, IntegrationConnectionStatuses.disconnected),
          success: l10n.integrationDisconnectedToast(provider),
        );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final formats = context.formats;
    final provider = integrationProviderLabel(l10n, connection);
    final handle = connection.accountHandle;
    final lastSync = connection.lastSyncAt;
    final error = connection.errorMessage;
    final statusLabel = integrationStatusLabel(l10n, connection.status);
    final subtitle = [?handle, ?clientName].join(' · ');

    return SurfaceCard(
      semanticLabel: '$provider, $statusLabel',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              InitialsAvatar(name: provider, seed: connection.providerId, mark: true, size: 44),
              SizedBox(width: tokens.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(provider, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleMedium),
                    Text(
                      subtitle.isEmpty ? l10n.integrationOrgWide : subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(color: tokens.muted),
                    ),
                  ],
                ),
              ),
              SizedBox(width: tokens.sm),
              StatusBadge(label: statusLabel, tone: integrationStatusTone(connection.status)),
              PermissionGate(
                anyOf: const [Permissions.integrationsManage],
                child: PopupMenuButton<_ConnectionAction>(
                  tooltip: l10n.moreActions,
                  onSelected: (action) => _onAction(context, ref, action),
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: _ConnectionAction.edit,
                      child: ListTile(leading: const Icon(Icons.edit_outlined), title: Text(l10n.edit)),
                    ),
                    if (connection.isConnected)
                      PopupMenuItem(
                        value: _ConnectionAction.disconnect,
                        child: ListTile(leading: const Icon(Icons.link_off), title: Text(l10n.integrationDisconnect)),
                      )
                    else
                      PopupMenuItem(
                        value: _ConnectionAction.connect,
                        child: ListTile(leading: const Icon(Icons.link), title: Text(l10n.integrationMarkConnected)),
                      ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: tokens.md),
          Row(
            children: [
              Icon(Icons.sync, size: 16, color: tokens.muted),
              SizedBox(width: tokens.xs),
              Expanded(
                child: Text(
                  lastSync == null ? l10n.integrationNeverSynced : l10n.integrationLastSync(formats.relative(lastSync)),
                  style: text.labelMedium?.copyWith(color: tokens.muted),
                ),
              ),
              Text(
                l10n.integrationSince(formats.shortDate(connection.createdAt)),
                style: text.labelMedium?.copyWith(color: tokens.muted),
              ),
            ],
          ),
          if (error != null) ...[
            SizedBox(height: tokens.sm),
            _ErrorNote(message: error),
          ],
        ],
      ),
    );
  }
}

class _ErrorNote extends StatelessWidget {
  const _ErrorNote({required this.message});

  static const _fillAlpha = 0.08;

  final String message;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final danger = StatusTone.danger.color(tokens);
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(tokens.sm),
      decoration: BoxDecoration(
        color: danger.withValues(alpha: _fillAlpha),
        borderRadius: tokens.borderRadius,
        border: Border.all(color: danger.withValues(alpha: _fillAlpha * 4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, size: 16, color: danger),
          SizedBox(width: tokens.sm),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.fg),
            ),
          ),
        ],
      ),
    );
  }
}
