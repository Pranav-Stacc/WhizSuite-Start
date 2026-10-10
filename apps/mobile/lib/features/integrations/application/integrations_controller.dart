import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/contracts/contracts.g.dart';
import '../../directory/application/directory_providers.dart';
import '../data/integrations_repository.dart';
import '../domain/integration_connection.dart';
import '../domain/platform_channel.dart';

/// Builds the client × platform matrix used by the integrations UI.
Future<List<PlatformChannel>> _buildChannels(Ref ref, {String? clientId}) async {
  final repo = ref.read(integrationsRepositoryProvider);
  final clients = ref.read(clientDirectoryProvider).value;
  if (clients == null) return const [];

  final targetClients = clientId == null
      ? clients.entries
      : clients.entries.where((c) => c.id == clientId);

  final accounts = await repo.listSocialAccounts(clientId: clientId);
  final accountFor = {for (final a in accounts) '${a.clientId}:${a.platform}': a};

  return [
    for (final client in targetClients)
      for (final platform in Platforms.values)
        accountFor['${client.id}:$platform'] ??
            PlatformChannel.disconnected(clientId: client.id, platform: platform),
  ];
}

final platformChannelsProvider = FutureProvider.autoDispose.family<List<PlatformChannel>, String?>(
  (ref, clientId) => _buildChannels(ref, clientId: clientId),
);

final integrationConnectionsProvider = FutureProvider.autoDispose<List<IntegrationConnection>>(
  (ref) => ref.watch(integrationsRepositoryProvider).listConnections(),
);

class IntegrationsActions {
  IntegrationsActions(this._ref);

  final Ref _ref;

  IntegrationsRepository get _repo => _ref.read(integrationsRepositoryProvider);

  Future<String> beginMetaOAuth({
    required String clientId,
    required String platform,
  }) =>
      _repo.beginMetaConnect(clientId: clientId, platform: platform);

  Future<void> disconnectMeta(String socialAccountId) async {
    await _repo.disconnectMeta(socialAccountId);
    _invalidate();
  }

  Future<void> connect(ConnectionInput input) async {
    await _repo.create(input);
    _invalidate();
  }

  Future<void> update(String id, ConnectionInput input) async {
    await _repo.update(id, input);
    _invalidate();
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _invalidate();
  }

  void refresh() => _invalidate();

  void _invalidate() {
    _ref.invalidate(platformChannelsProvider);
    _ref.invalidate(integrationConnectionsProvider);
  }
}

final integrationsActionsProvider = Provider<IntegrationsActions>(IntegrationsActions.new);

final integrationsLiveModeProvider = Provider<bool>(
  (ref) => ref.watch(appConfigProvider).liveMode,
);
