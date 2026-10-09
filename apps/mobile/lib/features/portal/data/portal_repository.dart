import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/portal_models.dart';

/// Reads the org-scoped list endpoints the portal home summarises. Each call needs the
/// permission the API's `@RequirePermissions` declares; the API client-scopes results
/// for portal memberships.
class PortalRepository {
  PortalRepository(this._api);

  final ApiClient _api;

  Future<List<Json>> _list(String resource) async => jsonList(await _api.get<Object?>(_api.org(resource)));

  /// clients.view — portal members typically see only their own client.
  Future<PortalClient?> client(String clientId) async {
    if (clientId.isEmpty) return null;
    try {
      return PortalClient.fromJson(jsonObject(await _api.get<Object?>(_api.org('clients/$clientId'))));
    } catch (_) {
      final listed = await _list('clients');
      return listed.map(PortalClient.fromJson).where((c) => c.id == clientId).firstOrNull;
    }
  }

  /// content.view
  Future<List<PortalContent>> content() async => (await _list('content')).map(PortalContent.fromJson).toList();

  /// invoices.view
  Future<List<PortalInvoice>> invoices() async => (await _list('invoices')).map(PortalInvoice.fromJson).toList();

  /// projects.view
  Future<List<PortalProject>> projects() async => (await _list('projects')).map(PortalProject.fromJson).toList();

  /// chat.view
  Future<List<PortalRoom>> rooms() async => (await _list('chat/rooms')).map(PortalRoom.fromJson).toList();
}

final portalRepositoryProvider = Provider<PortalRepository>(
  (ref) => PortalRepository(ref.watch(apiClientProvider)),
);
