import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../application/integrations_controller.dart';
import '../domain/platform_channel.dart';
import 'channel_row.dart';

class IntegrationsScreen extends ConsumerStatefulWidget {
  const IntegrationsScreen({
    this.initialClientId,
    this.oauthResult,
    super.key,
  });

  final String? initialClientId;
  final String? oauthResult;

  @override
  ConsumerState<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends ConsumerState<IntegrationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _showOAuthToast());
  }

  void _showOAuthToast() {
    final meta = widget.oauthResult;
    if (meta == null) return;
    final l10n = AppLocalizations.of(context);
    if (meta == 'connected') {
      showToast(context, l10n.integrationMetaConnected);
    } else if (meta == 'error') {
      showToast(context, l10n.integrationMetaFailed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final clientId = widget.initialClientId;
    final channels = ref.watch(platformChannelsProvider(clientId));
    final clients = ref.watch(clientDirectoryProvider).value;

    return PageScaffold(
      title: l10n.integrationsTitle,
      body: AsyncValueView<List<PlatformChannel>>(
        value: channels,
        onRetry: () => ref.invalidate(platformChannelsProvider(clientId)),
        isEmpty: (items) => items.isEmpty,
        empty: EmptyState(
          icon: Icons.extension_outlined,
          title: l10n.integrationsEmpty,
          body: l10n.integrationsEmptyBody,
        ),
        data: (rows) {
          final grouped = <String, List<PlatformChannel>>{};
          for (final row in rows) {
            grouped.putIfAbsent(row.clientId, () => []).add(row);
          }
          final clientIds = grouped.keys.toList()
            ..sort((a, b) => (clients?.nameOf(a) ?? a).compareTo(clients?.nameOf(b) ?? b));

          return RefreshIndicator(
            onRefresh: () => ref.refresh(platformChannelsProvider(clientId).future),
            child: ListView(
              padding: EdgeInsets.all(tokens.lg),
              children: [
                if (clientId == null)
                  Text(
                    l10n.integrationsChannelsHint,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
                  ),
                for (final id in clientIds) ...[
                  if (clientId == null) ...[
                    SizedBox(height: tokens.lg),
                    Text(
                      clients?.nameOf(id) ?? l10n.valueUnknown,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    SizedBox(height: tokens.sm),
                  ],
                  SurfaceCard(
                    child: Column(
                      children: [
                        for (final (i, channel) in grouped[id]!.indexed) ...[
                          if (i > 0) Divider(height: 1, color: tokens.border),
                          ChannelRow(
                            channel: channel,
                            clientName: clients?.nameOf(id) ?? l10n.valueUnknown,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
