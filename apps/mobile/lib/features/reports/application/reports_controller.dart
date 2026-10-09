import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/reports_repository.dart';
import '../domain/metric_series.dart';
import '../domain/report.dart';

final reportsProvider = FutureProvider.autoDispose<List<Report>>((ref) => ref.watch(reportsRepositoryProvider).list());

final reportProvider = FutureProvider.autoDispose.family<Report, String>(
  (ref, id) => ref.watch(reportsRepositoryProvider).get(id),
);

/// What the analytics view shows: a range in days, optionally scoped to one client's channels.
typedef AnalyticsQuery = ({int days, String? clientId});

/// Per-metric daily series for the range plus the previous period, so tiles can show change.
final analyticsProvider = FutureProvider.autoDispose.family<List<MetricSeries>, AnalyticsQuery>((ref, query) async {
  final repo = ref.watch(reportsRepositoryProvider);
  final now = DateTime.now();
  final (:previousStart, start: _) = analyticsWindow(query.days, now);
  final clientId = query.clientId;
  final (snapshots, channels) = await (
    repo.metrics(from: previousStart),
    clientId == null ? Future<Set<String>?>.value() : repo.clientChannelIds(clientId),
  ).wait;
  final scoped = channels == null ? snapshots : snapshots.where((s) => channels.contains(s.channelId));
  return buildMetricSeries(scoped, days: query.days, now: now);
});

/// Report mutations; each refreshes every view that shows reports.
class ReportsActions {
  ReportsActions(this._ref);

  final Ref _ref;

  ReportsRepository get _repo => _ref.read(reportsRepositoryProvider);

  Future<Report> create(ReportInput input) async {
    final report = await _repo.create(input);
    _invalidate();
    return report;
  }

  Future<void> update(String id, ReportInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _invalidate(id);
  }

  void _invalidate([String? id]) {
    _ref.invalidate(reportsProvider);
    if (id != null) _ref.invalidate(reportProvider(id));
  }
}

final reportsActionsProvider = Provider<ReportsActions>(ReportsActions.new);
