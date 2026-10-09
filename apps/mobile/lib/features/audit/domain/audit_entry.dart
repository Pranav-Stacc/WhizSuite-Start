import 'dart:convert';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

abstract final class AuditOutcomes {
  static const success = 'SUCCESS';
  static const failure = 'FAILURE';

  static const values = [success, failure];
}

abstract final class AuditActorTypes {
  static const user = 'user';
  static const system = 'system';
  static const service = 'service';

  static const values = [user, system, service];
}

const _actionSeparator = '.';

/// Entity type of records written by the API's request interceptor.
const httpRequestEntity = 'http_request';

/// One immutable audit record from `GET v1/audit-logs`.
class AuditEntry {
  const AuditEntry({
    required this.id,
    required this.action,
    required this.entityType,
    required this.actorType,
    required this.outcome,
    required this.createdAt,
    this.actorId,
    this.entityId,
    this.before,
    this.after,
    this.reason,
    this.ipAddress,
    this.userAgent,
    this.correlationId,
    this.metadata,
  });

  factory AuditEntry.fromJson(Json json) {
    final outcome = json.str('outcome').toUpperCase();
    return AuditEntry(
      id: json.str('id'),
      actorId: json.strOrNull('actorId'),
      actorType: json.str('actorType', AuditActorTypes.system).toLowerCase(),
      action: json.str('action'),
      entityType: json.str('entityType'),
      entityId: json.strOrNull('entityId'),
      before: json['before'],
      after: json['after'],
      outcome: AuditOutcomes.values.contains(outcome) ? outcome : AuditOutcomes.success,
      reason: json.strOrNull('reason'),
      ipAddress: json.strOrNull('ipAddress'),
      userAgent: json.strOrNull('userAgent'),
      correlationId: json.strOrNull('correlationId'),
      metadata: json.object('metadata'),
      createdAt: json.date('createdAt') ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
    );
  }

  final String id;
  final String? actorId;
  final String actorType;

  /// Dotted verb such as `membership.roles_assign`.
  final String action;
  final String entityType;
  final String? entityId;
  final Object? before;
  final Object? after;
  final String outcome;
  final String? reason;
  final String? ipAddress;
  final String? userAgent;
  final String? correlationId;
  final Json? metadata;
  final DateTime createdAt;

  bool get isFailure => outcome == AuditOutcomes.failure;

  /// Raw request records written by the global interceptor (`POST /v1/...`).
  bool get isHttpRequest => entityType == httpRequestEntity || action.contains(' ');

  /// Final segment of the action (`roles_assign`); request records keep the whole line.
  String get verb {
    if (isHttpRequest) return action;
    final index = action.lastIndexOf(_actionSeparator);
    return index < 0 ? action : action.substring(index + 1);
  }

  /// Leading segment of the action (`membership`), used for grouping.
  String get actionDomain {
    if (isHttpRequest) return httpRequestEntity;
    final index = action.indexOf(_actionSeparator);
    return index < 0 ? action : action.substring(0, index);
  }

  /// Optional human label recorded with the event.
  String? get entityLabel => metadata?.strOrNull('entityLabel');

  bool get hasChanges => before != null || after != null;
}

/// A cursor page of audit records.
class AuditPage {
  const AuditPage({required this.items, this.nextCursor, this.hasMore = false});

  factory AuditPage.fromJson(Object? raw) {
    final json = jsonObject(raw);
    final next = json.strOrNull('nextCursor');
    return AuditPage(
      items: jsonList(raw).map(AuditEntry.fromJson).toList(),
      nextCursor: next,
      hasMore: json.flag('hasMore', next != null) && next != null,
    );
  }

  final List<AuditEntry> items;
  final String? nextCursor;
  final bool hasMore;
}

enum AuditChangeKind { added, removed, changed, unchanged }

/// One top-level field compared between `before` and `after`.
class AuditChange {
  const AuditChange({required this.field, required this.kind, this.before, this.after});

  final String field;
  final AuditChangeKind kind;
  final Object? before;
  final Object? after;
}

/// Field-level diff of two JSON snapshots. Non-object snapshots are compared as one `value` field.
List<AuditChange> diffSnapshots(Object? before, Object? after) {
  const valueField = 'value';
  final left = before is Map ? before.cast<String, Object?>() : (before == null ? const <String, Object?>{} : {valueField: before});
  final right = after is Map ? after.cast<String, Object?>() : (after == null ? const <String, Object?>{} : {valueField: after});
  final fields = <String>{...left.keys, ...right.keys}.toList()..sort();
  return [
    for (final field in fields)
      AuditChange(
        field: field,
        before: left[field],
        after: right[field],
        kind: switch ((left.containsKey(field), right.containsKey(field))) {
          (false, _) => AuditChangeKind.added,
          (_, false) => AuditChangeKind.removed,
          _ when _jsonEquals(left[field], right[field]) => AuditChangeKind.unchanged,
          _ => AuditChangeKind.changed,
        },
      ),
  ];
}

const _encoder = JsonEncoder.withIndent('  ');

/// Pretty-printed JSON for display; strings are shown unquoted.
String prettyJson(Object? value) => value is String ? value : _encoder.convert(value);

bool _jsonEquals(Object? a, Object? b) => jsonEncode(a) == jsonEncode(b);
