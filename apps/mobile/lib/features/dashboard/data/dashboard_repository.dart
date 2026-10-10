import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/dashboard_models.dart';
import '../domain/dashboard_summaries.dart';

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

  /// calendar.view — scoped feed for the overview horizon (includes agent-created reminders).
  Future<List<CalendarEntry>> calendar({DateTime? now}) async {
    final anchor = now ?? DateTime.now();
    final start = DateTime(anchor.year, anchor.month, anchor.day);
    final end = start.add(const Duration(days: dashboardHorizonDays + 1));
    final from = Uri.encodeQueryComponent(start.toUtc().toIso8601String());
    final to = Uri.encodeQueryComponent(end.toUtc().toIso8601String());
    final url = '${_api.org('calendar/feed')}?from=$from&to=$to';
    return jsonList(await _api.get<Object?>(url)).map(CalendarEntry.fromFeedJson).toList();
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>(
  (ref) => DashboardRepository(ref.watch(apiClientProvider)),
);
