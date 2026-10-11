import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import 'google_calendar_sync_types.dart';

class GoogleCalendarConnection {
  const GoogleCalendarConnection({
    required this.status,
    this.connectionId,
    this.defaultSyncNewEvents = false,
    this.oauthConfigured = false,
    this.syncDirection = 'OUT',
    this.syncTypes = const GoogleCalendarSyncTypes(),
  });

  factory GoogleCalendarConnection.fromJson(Json json) => GoogleCalendarConnection(
        status: json.str('status', 'DISABLED'),
        connectionId: json.strOrNull('connectionId'),
        defaultSyncNewEvents: json.flag('defaultSyncNewEvents'),
        oauthConfigured: json.flag('oauthConfigured'),
        syncDirection: json.str('syncDirection', 'OUT'),
        syncTypes: GoogleCalendarSyncTypes.fromJson(json.object('syncTypes')),
      );

  static const disabled = GoogleCalendarConnection(status: 'DISABLED');

  final String status;
  final String? connectionId;
  final bool defaultSyncNewEvents;
  final bool oauthConfigured;
  final String syncDirection;
  final GoogleCalendarSyncTypes syncTypes;

  bool get isConnected => status == 'CONNECTED';
  bool get canPull => syncDirection == 'IN' || syncDirection == 'BOTH';
}
