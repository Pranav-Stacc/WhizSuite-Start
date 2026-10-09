import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/integrations_controller.dart';
import '../domain/integration_connection.dart';
import 'connection_card.dart';
import 'connection_forms.dart';
import 'integration_labels.dart';

class IntegrationsScreen extends ConsumerStatefulWidget {
  const IntegrationsScreen({super.key});

  @override
  ConsumerState<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends ConsumerState<IntegrationsScreen> {
  String? _status;

  Future<void> _connect() async {
    final l10n = AppLocalizations.of(context);
    final items = ref.read(integrationConnectionsProvider).value ?? const <IntegrationConnection>[];
    final created = await showConnectForm(context, ref, providers: knownProviders(items));
    if (created && mounted) showToast(context, l10n.integrationCreatedToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final connections = ref.watch(integrationConnectionsProvider);
    final clients = ref.watch(clientDirectoryProvider).value ?? Directory.empty;
    final items = connections.value ?? const <IntegrationConnection>[];
    final connected = items.where((c) => c.status == IntegrationConnectionStatuses.connected).length;
    final pending = items.where((c) => c.status == IntegrationConnectionStatuses.pending).length;
    final issues = items
        .where(
          (c) =>
              c.status == IntegrationConnectionStatuses.error ||
              c.status == IntegrationConnectionStatuses.disconnected,
        )
        .length;
    final connectButton = PermissionGate(
      anyOf: const [Permissions.integrationsManage],
      child: CreateFab(label: l10n.integrationConnect, icon: Icons.add_link, onPressed: _connect),
    );

    return PageScaffold(
      title: l10n.integrationsTitle,
      floatingActionButton: connectButton,
      body: ResourceList<IntegrationConnection>(
        value: connections,
        onRefresh: () => ref.refresh(integrationConnectionsProvider.future),
        minTileWidth: 360,
        tileHeight: 176,
        searchHint: l10n.integrationsSearch,
        matches: (connection, query) => [
          integrationProviderLabel(l10n, connection),
          connection.accountHandle,
          clients.nameOf(connection.clientId),
        ].any((value) => value?.toLowerCase().contains(query) ?? false),
        filter: (connection) => _status == null || connection.status == _status,
        sort: (a, b) {
          final byStatus = a.statusRank.compareTo(b.statusRank);
          return byStatus != 0 ? byStatus : b.updatedAt.compareTo(a.updatedAt);
        },
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (items.isNotEmpty) ...[
              LayoutBuilder(
                builder: (context, constraints) {
                  final tiles = [
                    MetricTile(
                      label: l10n.integrationKpiConnected,
                      icon: Icons.link,
                      value: '$connected',
                      tone: connected > 0 ? StatusTone.success : StatusTone.neutral,
                      onTap: () => setState(() => _status = IntegrationConnectionStatuses.connected),
                    ),
                    MetricTile(
                      label: l10n.integrationKpiPending,
                      icon: Icons.hourglass_empty,
                      value: '$pending',
                      onTap: () => setState(() => _status = IntegrationConnectionStatuses.pending),
                    ),
                    MetricTile(
                      label: l10n.integrationKpiIssues,
                      icon: Icons.warning_amber_rounded,
                      value: '$issues',
                      tone: issues > 0 ? StatusTone.danger : StatusTone.neutral,
                      onTap: () => setState(() => _status = IntegrationConnectionStatuses.error),
                    ),
                  ];
                  final columns = gridColumns(constraints.maxWidth, minTileWidth: 140, max: tiles.length);
                  final width = (constraints.maxWidth - tokens.md * (columns - 1)) / columns;
                  return Wrap(
                    spacing: tokens.md,
                    runSpacing: tokens.md,
                    children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
                  );
                },
              ),
              SizedBox(height: tokens.md),
            ],
            FilterBar<String>(
              options: integrationStatusOrder,
              selected: _status,
              labelOf: (status) => integrationStatusLabel(l10n, status),
              countOf: (status) => status == null ? items.length : items.where((c) => c.status == status).length,
              onSelected: (status) => setState(() => _status = status),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.extension_outlined,
          title: l10n.integrationsEmpty,
          body: l10n.integrationsEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.integrationsManage],
            child: FilledButton.icon(
              onPressed: _connect,
              icon: const Icon(Icons.add_link),
              label: Text(l10n.integrationConnect),
            ),
          ),
        ),
        itemBuilder: (context, connection) =>
            ConnectionCard(connection: connection, clientName: clients.nameOf(connection.clientId)),
      ),
    );
  }
}
