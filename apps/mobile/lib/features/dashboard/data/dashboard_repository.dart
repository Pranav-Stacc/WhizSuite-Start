import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/dashboard_models.dart';

/// Reads the list endpoints the staff overview summarises. Each call needs the
/// permission the API's `@RequirePermissions` declares (noted per method).
class DashboardRepository {
  DashboardRepository(this._api);

  final ApiClient _api;

  Future<List<Json>> _list(String resource) async => jsonList(await _api.get<Object?>(_api.org(resource)));

  /// tasks.view
  Future<List<WorkTask>> tasks() async => (await _list('tasks')).map(WorkTask.fromJson).toList();

  /// content.view
  Future<List<ContentRef>> content() async => (await _list('content')).map(ContentRef.fromJson).toList();

  /// approvals.view
  Future<List<ApprovalRef>> approvals() async => (await _list('approvals')).map(ApprovalRef.fromJson).toList();

  /// invoices.view
  Future<List<InvoiceRef>> invoices() async => (await _list('invoices')).map(InvoiceRef.fromJson).toList();

  /// clients.view
  Future<List<ClientRef>> clients() async => (await _list('clients')).map(ClientRef.fromJson).toList();

  /// leads.view
  Future<List<LeadRef>> leads() async => (await _list('leads')).map(LeadRef.fromJson).toList();

  /// projects.view
  Future<List<CalendarEntry>> calendar() async =>
      (await _list('calendar/items')).map(CalendarEntry.fromJson).toList();

  /// org.view
  Future<List<ActivityEntry>> activity() async => (await _list('activity')).map(ActivityEntry.fromJson).toList();
}

final dashboardRepositoryProvider = Provider<DashboardRepository>(
  (ref) => DashboardRepository(ref.watch(apiClientProvider)),
);
