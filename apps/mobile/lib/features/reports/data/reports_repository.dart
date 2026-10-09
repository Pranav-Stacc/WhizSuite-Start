import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/metric_series.dart';
import '../domain/report.dart';

class ReportsRepository {
  ReportsRepository(this._api);

  final ApiClient _api;

  String get _reports => _api.org('reports');

  Future<List<Report>> list() async => jsonList(await _api.get<Object?>(_reports)).map(Report.fromJson).toList();

  Future<Report> get(String id) async => Report.fromJson(jsonObject(await _api.get<Object?>('$_reports/$id')));

  Future<Report> create(ReportInput input) async =>
      Report.fromJson(jsonObject(await _api.post<Object?>(_reports, body: input.toJson())));

  Future<Report> update(String id, ReportInput input) async {
    final body = input.toJson()..remove('clientId');
    return Report.fromJson(jsonObject(await _api.patch<Object?>('$_reports/$id', body: body)));
  }

  Future<Report> setStatus(String id, String status) async =>
      Report.fromJson(jsonObject(await _api.patch<Object?>('$_reports/$id', body: {'status': status})));

  /// Metric snapshots recorded since [from], newest first (capped server-side).
  Future<List<MetricSnapshot>> metrics({required DateTime from}) async {
    final raw = await _api.get<Object?>(_api.org('analytics/metrics'), query: {'from': from.toUtc().toIso8601String()});
    return jsonList(raw).map(MetricSnapshot.fromJson).toList();
  }

  /// Ids of the social channels connected for [clientId], used to scope metrics to a client.
  Future<Set<String>> clientChannelIds(String clientId) async {
    final accounts = jsonList(await _api.get<Object?>(_api.org('social-accounts'), query: {'clientId': clientId}));
    return {
      for (final account in accounts)
        for (final channel in account.objects('channels')) ?channel.strOrNull('id'),
    };
  }
}

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) => ReportsRepository(ref.watch(apiClientProvider)));
