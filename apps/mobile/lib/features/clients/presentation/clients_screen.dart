import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/resource_list.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/presentation/permission_gate.dart';
import '../application/clients_controller.dart';
import '../clients_routes.dart';
import '../domain/client.dart';
import 'client_card.dart';
import 'client_forms.dart';
import 'client_status.dart';

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key});

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  String? _status;

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context);
    final created = await showClientForm(context, ref);
    if (created && mounted) showToast(context, l10n.createdToast);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final clients = ref.watch(clientsProvider);
    final items = clients.value ?? const <Client>[];
    final createButton = PermissionGate(
      anyOf: const [Permissions.clientsCreate],
      child: CreateFab(label: l10n.clientNew, onPressed: _create),
    );

    return PageScaffold(
      title: l10n.clientsTitle,
      floatingActionButton: createButton,
      body: ResourceList<Client>(
        value: clients,
        onRefresh: () => ref.refresh(clientsProvider.future),
        minTileWidth: 320,
        tileHeight: 196,
        searchHint: l10n.clientsSearch,
        matches: (client, query) =>
            client.name.toLowerCase().contains(query) || (client.industry?.toLowerCase().contains(query) ?? false),
        filter: (client) => _status == null || client.status == _status,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (items.isNotEmpty) ...[
              LayoutBuilder(
                builder: (context, constraints) {
                  final tiles = [
                    MetricTile(
                      label: l10n.clientStatAll,
                      icon: Icons.business_outlined,
                      value: '${items.length}',
                      onTap: () => setState(() => _status = null),
                    ),
                    MetricTile(
                      label: l10n.clientStatActive,
                      icon: Icons.check_circle_outline,
                      value: '${items.where((c) => c.status == ClientStatuses.active).length}',
                      onTap: () => setState(() => _status = ClientStatuses.active),
                    ),
                    MetricTile(
                      label: l10n.clientStatOnboarding,
                      icon: Icons.rocket_launch_outlined,
                      value: '${items.where((c) => c.status == ClientStatuses.onboarding).length}',
                      onTap: () => setState(() => _status = ClientStatuses.onboarding),
                    ),
                    MetricTile(
                      label: l10n.clientStatPaused,
                      icon: Icons.pause_circle_outline,
                      value: '${items.where((c) => c.status == ClientStatuses.paused).length}',
                      onTap: () => setState(() => _status = ClientStatuses.paused),
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
              options: ClientStatuses.values,
              selected: _status,
              labelOf: (status) => clientStatusLabel(l10n, status),
              countOf: (status) => status == null ? items.length : items.where((c) => c.status == status).length,
              onSelected: (status) => setState(() => _status = status),
            ),
          ],
        ),
        empty: EmptyState(
          icon: Icons.business_outlined,
          title: l10n.clientsEmpty,
          body: l10n.clientsEmptyBody,
          action: PermissionGate(
            anyOf: const [Permissions.clientsCreate],
            child: FilledButton.icon(onPressed: _create, icon: const Icon(Icons.add), label: Text(l10n.clientNew)),
          ),
        ),
        itemBuilder: (context, client) => ClientCard(
          client: client,
          onTap: () => context.go(ClientsRoutes.detail(client.id)),
        ),
      ),
    );
  }
}
