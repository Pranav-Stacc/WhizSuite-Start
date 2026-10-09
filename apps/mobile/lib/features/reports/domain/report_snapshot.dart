import '../../../core/network/api_client.dart';
import 'report.dart';

/// A labelled number from a snapshot, rendered as a KPI tile.
class SnapshotMetric {
  const SnapshotMetric(this.label, this.value);

  final String label;
  final num value;
}

/// A labelled value from a snapshot, rendered as an info row: either [text] or a yes/no [flag].
class SnapshotFact {
  const SnapshotFact(this.label, this.text) : flag = null;

  const SnapshotFact.flag(this.label, bool this.flag) : text = '';

  final String label;
  final String text;
  final bool? flag;
}

/// A titled block of facts, from a nested object or a list of objects.
class SnapshotSection {
  const SnapshotSection(this.title, this.facts);

  final String title;
  final List<SnapshotFact> facts;
}

/// A titled list of plain values, rendered as chips.
class SnapshotTags {
  const SnapshotTags(this.title, this.values);

  final String title;
  final List<String> values;
}

/// Structured reading of a report's free-form snapshot JSON, so any shape renders meaningfully:
/// top-level numbers become metrics, text and flags become facts, objects and lists of objects
/// become sections, and lists of values become tags.
class ReportSnapshot {
  const ReportSnapshot({
    this.summary,
    this.metrics = const [],
    this.facts = const [],
    this.sections = const [],
    this.tags = const [],
  });

  factory ReportSnapshot.parse(Json? json) {
    if (json == null) return const ReportSnapshot();
    String? summary;
    final metrics = <SnapshotMetric>[];
    final facts = <SnapshotFact>[];
    final sections = <SnapshotSection>[];
    final tags = <SnapshotTags>[];

    for (final MapEntry(:key, :value) in json.entries) {
      final label = humanizeKey(key);
      switch (value) {
        case String text when key == reportSummaryKey:
          if (text.trim().isNotEmpty) summary = text.trim();
        case num number:
          metrics.add(SnapshotMetric(label, number));
        case Map<Object?, Object?> map:
          final rows = _facts(map);
          if (rows.isNotEmpty) sections.add(SnapshotSection(label, rows));
        case List<Object?> list when list.isNotEmpty && list.every((item) => item is Map):
          sections.add(
            SnapshotSection(label, [
              for (final (index, item) in list.indexed)
                if (item is Map) _row(item, index),
            ]),
          );
        case List<Object?> list:
          final values = [for (final item in list) ?_scalar(item)];
          if (values.isNotEmpty) tags.add(SnapshotTags(label, values));
        default:
          if (_fact(label, value) case final fact?) facts.add(fact);
      }
    }
    return ReportSnapshot(summary: summary, metrics: metrics, facts: facts, sections: sections, tags: tags);
  }

  final String? summary;
  final List<SnapshotMetric> metrics;
  final List<SnapshotFact> facts;
  final List<SnapshotSection> sections;
  final List<SnapshotTags> tags;

  bool get isEmpty => summary == null && metrics.isEmpty && facts.isEmpty && sections.isEmpty && tags.isEmpty;

  /// Keys that name a row inside a list of objects, in order of preference.
  static const _nameKeys = ['name', 'title', 'label', 'metric', 'channel', 'key'];

  static const _detailSeparator = ' · ';

  static List<SnapshotFact> _facts(Map<Object?, Object?> map) => [
    for (final MapEntry(:key, :value) in map.entries) ?_fact(humanizeKey('$key'), value),
  ];

  static SnapshotFact? _fact(String label, Object? value) => switch (value) {
    final bool flag => SnapshotFact.flag(label, flag),
    _ => switch (_scalar(value)) {
      final String text => SnapshotFact(label, text),
      null => null,
    },
  };

  /// One row per object: named by its first [_nameKeys] field, detailed by its other values.
  /// True flags list just their label; false flags are left out.
  static SnapshotFact _row(Map<Object?, Object?> item, int index) {
    final nameKey = _nameKeys.firstWhere((k) => item[k] is String, orElse: () => '');
    final name = nameKey.isEmpty ? '${index + 1}' : '${item[nameKey]}';
    final details = [
      for (final MapEntry(:key, :value) in item.entries)
        if (key != nameKey)
          if (value == true)
            humanizeKey('$key')
          else if (_scalar(value) case final text?)
            '${humanizeKey('$key')}: $text',
    ];
    return SnapshotFact(name, details.join(_detailSeparator));
  }

  static String? _scalar(Object? value) => switch (value) {
    final String text when text.trim().isNotEmpty => text.trim(),
    final num number => _number(number),
    _ => null,
  };

  static String _number(num value) =>
      value is int || value == value.roundToDouble() ? value.round().toString() : value.toStringAsFixed(2);
}

/// `engagementRate` / `engagement_rate` / `engagement-rate` → `Engagement rate`.
String humanizeKey(String key) {
  final spaced = key
      .replaceAllMapped(RegExp('([a-z0-9])([A-Z])'), (m) => '${m[1]} ${m[2]}')
      .replaceAll(RegExp('[_-]+'), ' ')
      .trim()
      .toLowerCase();
  if (spaced.isEmpty) return key;
  return spaced[0].toUpperCase() + spaced.substring(1);
}
