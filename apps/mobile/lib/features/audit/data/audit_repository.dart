import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/audit_entry.dart';

/// Reads the tenant's audit log; the organisation comes from the access token.
class AuditRepository {
  AuditRepository(this._api);

  static const _path = 'v1/audit-logs';

  /// Page size; the API caps it at 100.
  static const pageSize = 30;

  final ApiClient _api;

  Future<AuditPage> page({String? cursor}) async =>
      AuditPage.fromJson(await _api.get<Object?>(_path, query: {'cursor': cursor, 'limit': pageSize}));
}

final auditRepositoryProvider = Provider<AuditRepository>((ref) => AuditRepository(ref.watch(apiClientProvider)));
