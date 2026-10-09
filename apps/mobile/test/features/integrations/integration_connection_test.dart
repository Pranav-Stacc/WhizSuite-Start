import 'package:agency_os/core/contracts/contracts.g.dart';
import 'package:agency_os/features/integrations/domain/integration_connection.dart';
import 'package:flutter_test/flutter_test.dart';

const _providerId = '0f8fad5b-d9cb-469f-a165-70867728950e';

IntegrationConnection _connection({String status = 'CONNECTED', Map<String, Object?> metadata = const {}}) =>
    IntegrationConnection.fromJson({
      'id': 'c1',
      'providerId': _providerId,
      'status': status,
      'metadata': metadata,
      'createdAt': '2026-01-01T00:00:00.000Z',
    });

void main() {
  group('IntegrationConnection', () {
    test('reads display details from metadata, including legacy keys', () {
      final connection = _connection(
        metadata: {'providerName': 'Meta', 'handle': '@acme', 'error': 'Token expired', 'lastSyncAt': '2026-02-01T10:00:00.000Z'},
      );
      expect(connection.providerName, 'Meta');
      expect(connection.accountHandle, '@acme');
      expect(connection.errorMessage, 'Token expired');
      expect(connection.lastSyncAt, DateTime.utc(2026, 2, 1, 10));
    });

    test('unknown status falls back to pending', () {
      expect(_connection(status: 'WEIRD').status, IntegrationConnectionStatuses.pending);
    });

    test('ranks problems before healthy connections', () {
      expect(
        _connection(status: IntegrationConnectionStatuses.error).statusRank,
        lessThan(_connection(status: IntegrationConnectionStatuses.connected).statusRank),
      );
    });
  });

  group('ConnectionInput', () {
    test('merges edits over existing metadata and drops cleared values', () {
      const input = ConnectionInput(
        status: IntegrationConnectionStatuses.connected,
        providerName: 'LinkedIn',
        accountHandle: '',
        base: {'handle': '@old', 'accountHandle': '@old', 'scopes': ['read']},
      );
      expect(input.metadata, {'providerName': 'LinkedIn', 'scopes': ['read']});
      expect(input.toUpdateJson()['status'], IntegrationConnectionStatuses.connected);
    });

    test('create body omits an absent client', () {
      const input = ConnectionInput(providerId: _providerId, accountHandle: '@acme');
      expect(input.toCreateJson(), {'providerId': _providerId, 'metadata': {'accountHandle': '@acme'}});
    });
  });

  test('isProviderId accepts UUIDs only', () {
    expect(isProviderId(' $_providerId '), isTrue);
    expect(isProviderId(_providerId.toUpperCase()), isTrue);
    expect(isProviderId('meta'), isFalse);
  });

  test('knownProviders keeps the first known name per provider', () {
    final providers = knownProviders([
      _connection(),
      _connection(metadata: {'providerName': 'Meta'}),
      _connection(metadata: {'providerName': 'Other'}),
    ]);
    expect(providers, {_providerId: 'Meta'});
  });
}
