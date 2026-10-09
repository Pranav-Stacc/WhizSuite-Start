import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Keys this app reads from and writes to a connection's free-form `metadata`.
abstract final class ConnectionMetadataKeys {
  static const providerName = 'providerName';
  static const accountHandle = 'accountHandle';
  static const handle = 'handle';
  static const lastSyncAt = 'lastSyncAt';
  static const error = 'error';
  static const errorMessage = 'errorMessage';
}

/// Display order when connections are sorted by status: problems first.
const integrationStatusOrder = [
  IntegrationConnectionStatuses.error,
  IntegrationConnectionStatuses.pending,
  IntegrationConnectionStatuses.connected,
  IntegrationConnectionStatuses.disconnected,
];

/// A provider account linked to the organization, optionally for one client.
class IntegrationConnection {
  const IntegrationConnection({
    required this.id,
    required this.providerId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.clientId,
    this.metadata = const {},
  });

  factory IntegrationConnection.fromJson(Json json) {
    final createdAt = json.date('createdAt') ?? DateTime.now();
    final status = json.str('status');
    return IntegrationConnection(
      id: json.str('id'),
      providerId: json.str('providerId'),
      clientId: json.strOrNull('clientId'),
      status: IntegrationConnectionStatuses.values.contains(status) ? status : IntegrationConnectionStatuses.pending,
      metadata: json.object('metadata') ?? const {},
      createdAt: createdAt,
      updatedAt: json.date('updatedAt') ?? createdAt,
    );
  }

  final String id;
  final String providerId;
  final String? clientId;
  final String status;
  final Json metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  String? get providerName => metadata.strOrNull(ConnectionMetadataKeys.providerName);

  String? get accountHandle =>
      metadata.strOrNull(ConnectionMetadataKeys.accountHandle) ?? metadata.strOrNull(ConnectionMetadataKeys.handle);

  DateTime? get lastSyncAt => metadata.date(ConnectionMetadataKeys.lastSyncAt);

  String? get errorMessage =>
      metadata.strOrNull(ConnectionMetadataKeys.errorMessage) ?? metadata.strOrNull(ConnectionMetadataKeys.error);

  bool get isConnected => status == IntegrationConnectionStatuses.connected;

  int get statusRank {
    final index = integrationStatusOrder.indexOf(status);
    return index < 0 ? integrationStatusOrder.length : index;
  }
}

/// Fields the connection forms edit. Metadata edits are merged over [base] so unknown keys survive.
class ConnectionInput {
  const ConnectionInput({this.providerId, this.clientId, this.status, this.providerName, this.accountHandle, this.base = const {}});

  final String? providerId;
  final String? clientId;
  final String? status;
  final String? providerName;
  final String? accountHandle;
  final Json base;

  Json get metadata {
    final merged = {...base};
    void put(String key, String? value) {
      if (value == null || value.isEmpty) {
        merged.remove(key);
      } else {
        merged[key] = value;
      }
    }

    put(ConnectionMetadataKeys.providerName, providerName);
    put(ConnectionMetadataKeys.accountHandle, accountHandle);
    merged.remove(ConnectionMetadataKeys.handle);
    return merged;
  }

  Json toCreateJson() => {'providerId': ?providerId, 'clientId': ?clientId, 'metadata': metadata};

  Json toUpdateJson() => {'status': ?status, 'metadata': metadata};
}

final _uuid = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', caseSensitive: false);

/// The API identifies providers by UUID.
bool isProviderId(String value) => _uuid.hasMatch(value.trim());

/// Distinct providers seen on existing connections, so a new connection can reuse one.
Map<String, String?> knownProviders(Iterable<IntegrationConnection> connections) {
  final providers = <String, String?>{};
  for (final connection in connections) {
    providers[connection.providerId] ??= connection.providerName;
  }
  return providers;
}
