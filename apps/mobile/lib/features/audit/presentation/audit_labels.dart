import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/domain/directory_entry.dart';
import '../../roles/domain/humanize.dart';
import '../domain/audit_entry.dart';

/// "Membership", "Invitation"… with a humanised fallback for new entity types.
String auditEntityTypeLabel(AppLocalizations l10n, String entityType) {
  final key = entityType == entityType.toUpperCase() ? entityType.toLowerCase() : entityType;
  return l10n.auditEntityType(selectKey(key), humanizeKey(key));
}

/// Past-tense verb for the action ("Roles assigned"); request records show the raw request line.
String auditActionLabel(AppLocalizations l10n, AuditEntry entry) =>
    entry.isHttpRequest ? entry.verb : l10n.auditVerb(selectKey(entry.verb), humanizeKey(entry.verb));

/// Leading action segment for filters ("Membership").
String auditActionDomainLabel(AppLocalizations l10n, String domain) => auditEntityTypeLabel(l10n, domain);

String auditOutcomeLabel(AppLocalizations l10n, String outcome) => l10n.auditOutcome(outcome);

StatusTone auditOutcomeTone(String outcome) =>
    outcome == AuditOutcomes.failure ? StatusTone.danger : StatusTone.success;

/// Display name for who performed the action, from the member directory when available.
String auditActorName(AppLocalizations l10n, AuditEntry entry, Directory members) =>
    members.nameOf(entry.actorId) ?? l10n.auditActorType(entry.actorType);

/// Text matched by the search box.
String auditSearchText(AppLocalizations l10n, AuditEntry entry, Directory members) => [
      auditActorName(l10n, entry, members),
      entry.action,
      auditActionLabel(l10n, entry),
      entry.entityType,
      auditEntityTypeLabel(l10n, entry.entityType),
      ?entry.entityLabel,
      ?entry.entityId,
      ?entry.correlationId,
      ?entry.ipAddress,
    ].join(' ');
