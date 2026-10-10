import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// One client × platform row — mirrors the web integrations channel list.
class PlatformChannel {
  const PlatformChannel({
    required this.id,
    required this.clientId,
    required this.platform,
    required this.handle,
    required this.connected,
    this.followers = 0,
    this.lastSyncAt,
  });

  /// Synthetic id for disconnected rows (`clientId:platform`).
  factory PlatformChannel.disconnected({
    required String clientId,
    required String platform,
  }) =>
      PlatformChannel(
        id: '$clientId:$platform',
        clientId: clientId,
        platform: platform,
        handle: '',
        connected: false,
      );

  factory PlatformChannel.fromSocialAccount(Json json) {
    final platform = json.str('platform').toLowerCase();
    final status = json.str('status');
    return PlatformChannel(
      id: json.str('id'),
      clientId: json.str('clientId'),
      platform: Platforms.values.contains(platform) ? platform : Platforms.instagram,
      handle: json.str('displayName'),
      connected: status == 'CONNECTED',
      lastSyncAt: json.date('updatedAt'),
    );
  }

  final String id;
  final String clientId;
  final String platform;
  final String handle;
  final bool connected;
  final int followers;
  final DateTime? lastSyncAt;

  bool get isMeta => platform == Platforms.instagram || platform == Platforms.facebook;

  bool get isSyntheticId => id.contains(':');
}
