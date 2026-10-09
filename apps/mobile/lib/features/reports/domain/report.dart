import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../invoices/domain/calendar_date.dart';

/// Forward lifecycle of a client report; a ready report can go back to draft for more edits.
const Map<String, List<String>> reportTransitions = {
  ReportStatuses.draft: [ReportStatuses.ready],
  ReportStatuses.ready: [ReportStatuses.sent, ReportStatuses.draft],
  ReportStatuses.sent: [],
};

/// Snapshot key the app reads and writes the narrative summary under.
const reportSummaryKey = 'summary';

class Report {
  const Report({
    required this.id,
    required this.clientId,
    required this.title,
    required this.status,
    required this.periodStart,
    required this.periodEnd,
    required this.createdAt,
    this.templateId,
    this.snapshot,
  });

  factory Report.fromJson(Json json) {
    final status = json.str('status');
    final created = json.date('createdAt') ?? DateTime.now();
    return Report(
      id: json.str('id'),
      clientId: json.str('clientId'),
      templateId: json.strOrNull('templateId'),
      title: json.str('title'),
      status: ReportStatuses.values.contains(status) ? status : ReportStatuses.draft,
      periodStart: calendarDate(json, 'periodStart') ?? created,
      periodEnd: calendarDate(json, 'periodEnd') ?? created,
      createdAt: created,
      snapshot: json.object('snapshot'),
    );
  }

  final String id;
  final String clientId;
  final String? templateId;
  final String title;
  final String status;
  final DateTime periodStart;
  final DateTime periodEnd;
  final DateTime createdAt;

  /// Free-form figures and narrative captured for the period.
  final Json? snapshot;

  List<String> get nextStatuses => reportTransitions[status] ?? const [];

  String? get summary {
    final value = snapshot?[reportSummaryKey];
    return value is String && value.trim().isNotEmpty ? value : null;
  }
}

/// Fields a report form edits. [clientId] is only sent on create.
class ReportInput {
  const ReportInput({
    required this.title,
    required this.periodStart,
    required this.periodEnd,
    this.clientId,
    this.status,
    this.summary,
    this.baseSnapshot,
  });

  final String title;
  final DateTime periodStart;
  final DateTime periodEnd;
  final String? clientId;
  final String? status;

  /// Narrative summary merged into the snapshot; null leaves the snapshot untouched.
  final String? summary;

  /// Existing snapshot the summary is merged into, so other figures are preserved.
  final Json? baseSnapshot;

  Json? get _snapshot {
    final text = summary?.trim();
    if (text == null) return null;
    final Json next = {...?baseSnapshot};
    if (text.isEmpty) {
      next.remove(reportSummaryKey);
    } else {
      next[reportSummaryKey] = text;
    }
    return next;
  }

  Json toJson() {
    final snapshot = _snapshot;
    return {
      'clientId': ?clientId,
      'title': title,
      'periodStart': dateKey(periodStart),
      'periodEnd': dateKey(periodEnd),
      'status': ?status,
      'snapshot': ?snapshot,
    };
  }
}
