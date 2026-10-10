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
        tileHeight: 168,
        searchHint: l10n.clientsSearch,
        matches: (client, query) =>
            client.name.toLowerCase().contains(query) || (client.industry?.toLowerCase().contains(query) ?? false),
        filter: (client) => _status == null || client.status == _status,
        header: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (items.isNotEmpty) ...[
              _ClientStatStrip(
                items: items,
                selected: _status,
                onSelected: (status) => setState(() => _status = status),
              ),
              SizedBox(height: tokens.sm),
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
          onTap: () => context.push(ClientsRoutes.detail(client.id)),
        ),
      ),
    );
  }
}

/// Compact horizontal status chips — avoids a tall 2×2 KPI block on the list.
class _ClientStatStrip extends StatelessWidget {
  const _ClientStatStrip({required this.items, required this.selected, required this.onSelected});

  final List<Client> items;
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final stats = <({String? status, String label, IconData icon, int count})>[
      (status: null, label: l10n.clientStatAll, icon: Icons.business_outlined, count: items.length),
      (
        status: ClientStatuses.active,
        label: l10n.clientStatActive,
        icon: Icons.check_circle_outline,
        count: items.where((c) => c.status == ClientStatuses.active).length,
      ),
      (
        status: ClientStatuses.onboarding,
        label: l10n.clientStatOnboarding,
        icon: Icons.rocket_launch_outlined,
        count: items.where((c) => c.status == ClientStatuses.onboarding).length,
      ),
      (
        status: ClientStatuses.paused,
        label: l10n.clientStatPaused,
        icon: Icons.pause_circle_outline,
        count: items.where((c) => c.status == ClientStatuses.paused).length,
      ),
    ];

    return SizedBox(
      height: 72,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: stats.length,
        separatorBuilder: (_, _) => SizedBox(width: tokens.sm),
        itemBuilder: (context, index) {
          final stat = stats[index];
          final active = selected == stat.status;
          return SizedBox(
            width: 112,
            child: SurfaceCard(
              onTap: () => onSelected(stat.status),
              padding: EdgeInsets.all(tokens.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Icon(stat.icon, size: 14, color: active ? tokens.primary : tokens.muted),
                      SizedBox(width: tokens.xs),
                      Expanded(
                        child: Text(
                          stat.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: active ? tokens.fg : tokens.muted,
                                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                              ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: tokens.xs),
                  Text(
                    '${stat.count}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600, height: 1),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
