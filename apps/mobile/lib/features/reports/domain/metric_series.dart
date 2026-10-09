import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Ranges (in days) the analytics view offers, and the default one.
const analyticsRanges = [7, 30, 90];
const analyticsDefaultRange = 30;

/// Metrics that are a level at a point in time (summing them across days would be wrong):
/// each day shows the latest reading per channel, carried forward over days without one.
const gaugeMetricKeys = {'followers', 'subscribers'};

/// Display order for the well-known metrics; anything else follows alphabetically.
const metricDisplayOrder = ['reach', 'engagement', 'followers', 'impressions'];

/// One recorded value of a metric, for a channel at a moment.
class MetricSnapshot {
  const MetricSnapshot({required this.metricKey, required this.value, required this.recordedAt, this.channelId});

  factory MetricSnapshot.fromJson(Json json) => MetricSnapshot(
    metricKey: json.str('metricKey'),
    channelId: json.strOrNull('channelId'),
    value: json.decimal('value'),
    recordedAt: (json.date('recordedAt') ?? DateTime.now()).toLocal(),
  );

  final String metricKey;
  final String? channelId;
  final double value;
  final DateTime recordedAt;
}

/// A metric's daily values over the selected range, with the same-length previous period for comparison.
class MetricSeries {
  const MetricSeries({
    required this.key,
    required this.start,
    required this.daily,
    required this.total,
    required this.previousTotal,
    required this.isGauge,
  });

  final String key;

  /// First day of [daily].
  final DateTime start;
  final List<double> daily;

  /// Sum over the range, or the latest level for a gauge.
  final double total;

  /// The same figure for the period right before; null without data there.
  final double? previousTotal;
  final bool isGauge;

  DateTime dayAt(int index) => DateTime(start.year, start.month, start.day + index);

  /// Relative change against the previous period (0.25 = +25%), or null when not comparable.
  double? get change {
    final previous = previousTotal;
    if (previous == null || previous == 0) return null;
    return (total - previous) / previous.abs();
  }

  double get peak => daily.fold(0, (max, v) => v > max ? v : max);
}

/// First day (local midnight) of a [days]-long range ending today, and of the period before it.
({DateTime start, DateTime previousStart}) analyticsWindow(int days, DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  final start = DateTime(today.year, today.month, today.day - (days - 1));
  return (start: start, previousStart: DateTime(start.year, start.month, start.day - days));
}

/// Buckets [snapshots] into one [MetricSeries] per metric key over the [days] ending at [now].
/// Snapshots before the previous period or after today are ignored.
List<MetricSeries> buildMetricSeries(Iterable<MetricSnapshot> snapshots, {required int days, required DateTime now}) {
  final (:start, :previousStart) = analyticsWindow(days, now);
  final span = days * 2;
  final byKey = <String, List<MetricSnapshot>>{};
  for (final snapshot in snapshots) {
    final index = _dayIndex(previousStart, snapshot.recordedAt);
    if (index < 0 || index >= span) continue;
    (byKey[snapshot.metricKey] ??= []).add(snapshot);
  }

  final series = [
    for (final MapEntry(:key, :value) in byKey.entries)
      _series(key, value, previousStart: previousStart, start: start, days: days),
  ];
  series.sort((a, b) {
    final byOrder = _orderOf(a.key).compareTo(_orderOf(b.key));
    return byOrder != 0 ? byOrder : a.key.compareTo(b.key);
  });
  return series;
}

int _orderOf(String key) {
  final index = metricDisplayOrder.indexOf(key);
  return index < 0 ? metricDisplayOrder.length : index;
}

int _dayIndex(DateTime from, DateTime at) =>
    DateTime.utc(at.year, at.month, at.day).difference(DateTime.utc(from.year, from.month, from.day)).inDays;

MetricSeries _series(
  String key,
  List<MetricSnapshot> snapshots, {
  required DateTime previousStart,
  required DateTime start,
  required int days,
}) {
  final span = days * 2;
  final isGauge = gaugeMetricKeys.contains(key);
  final values = isGauge ? _gaugeDays(snapshots, previousStart, span) : _flowDays(snapshots, previousStart, span);
  final previous = values.sublist(0, days);
  final current = values.sublist(days);
  final hasPrevious = snapshots.any((s) => _dayIndex(previousStart, s.recordedAt) < days);
  double sum(List<double> list) => list.fold(0, (a, b) => a + b);
  return MetricSeries(
    key: key,
    start: start,
    daily: current,
    isGauge: isGauge,
    total: isGauge ? current.last : sum(current),
    previousTotal: hasPrevious ? (isGauge ? previous.last : sum(previous)) : null,
  );
}

List<double> _flowDays(List<MetricSnapshot> snapshots, DateTime from, int span) {
  final days = List<double>.filled(span, 0);
  for (final snapshot in snapshots) {
    days[_dayIndex(from, snapshot.recordedAt)] += snapshot.value;
  }
  return days;
}

List<double> _gaugeDays(List<MetricSnapshot> snapshots, DateTime from, int span) {
  // Latest reading per channel per day.
  final latest = <String, Map<int, MetricSnapshot>>{};
  for (final snapshot in snapshots) {
    final perDay = latest[snapshot.channelId ?? ''] ??= {};
    final index = _dayIndex(from, snapshot.recordedAt);
    final current = perDay[index];
    if (current == null || snapshot.recordedAt.isAfter(current.recordedAt)) perDay[index] = snapshot;
  }
  final days = List<double>.filled(span, 0);
  for (final perDay in latest.values) {
    double level = 0;
    for (var day = 0; day < span; day++) {
      level = perDay[day]?.value ?? level;
      days[day] += level;
    }
  }
  return days;
}
