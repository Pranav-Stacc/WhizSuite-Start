import 'audit_entry.dart';

/// Look-back windows offered in the filter, in days; null means all time.
const auditRangeDays = <int?>[1, 7, 30, 90, null];

/// Client-side narrowing of the loaded audit log (the API only pages by cursor).
class AuditFilter {
  const AuditFilter({
    this.query = '',
    this.actorId,
    this.actionDomain,
    this.entityType,
    this.outcome,
    this.rangeDays,
  });

  final String query;
  final String? actorId;
  final String? actionDomain;
  final String? entityType;
  final String? outcome;
  final int? rangeDays;

  /// Number of filters other than search, for the filter button badge.
  int get activeCount =>
      [actorId, actionDomain, entityType, outcome, rangeDays].where((value) => value != null).length;

  bool matches(AuditEntry entry, {required String Function(AuditEntry) searchText, DateTime? now}) {
    if (actorId != null && entry.actorId != actorId) return false;
    if (actionDomain != null && entry.actionDomain != actionDomain) return false;
    if (entityType != null && entry.entityType != entityType) return false;
    if (outcome != null && entry.outcome != outcome) return false;
    final days = rangeDays;
    if (days != null && entry.createdAt.isBefore((now ?? DateTime.now()).subtract(Duration(days: days)))) {
      return false;
    }
    final needle = query.trim().toLowerCase();
    return needle.isEmpty || searchText(entry).toLowerCase().contains(needle);
  }

  AuditFilter copyWith({
    String? query,
    String? Function()? actorId,
    String? Function()? actionDomain,
    String? Function()? entityType,
    String? Function()? outcome,
    int? Function()? rangeDays,
  }) =>
      AuditFilter(
        query: query ?? this.query,
        actorId: actorId == null ? this.actorId : actorId(),
        actionDomain: actionDomain == null ? this.actionDomain : actionDomain(),
        entityType: entityType == null ? this.entityType : entityType(),
        outcome: outcome == null ? this.outcome : outcome(),
        rangeDays: rangeDays == null ? this.rangeDays : rangeDays(),
      );

  /// Clears every filter but keeps the search text.
  AuditFilter cleared() => AuditFilter(query: query);
}
