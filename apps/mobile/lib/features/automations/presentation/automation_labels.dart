import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/automation.dart';

String automationTriggerLabel(AppLocalizations l10n, String? trigger) =>
    trigger == null ? l10n.valueUnknown : l10n.automationTrigger(automationMessageKey(trigger));

String automationActionLabel(AppLocalizations l10n, String? action) =>
    action == null ? l10n.valueUnknown : l10n.automationAction(automationMessageKey(action));

String automationStatusLabel(AppLocalizations l10n, String status) => l10n.automationStatus(status);

StatusTone automationStatusTone(String status) =>
    status == AutomationStatuses.active ? StatusTone.success : StatusTone.neutral;

StatusTone automationSuccessTone(double rate) {
  const healthy = 0.95;
  const degraded = 0.8;
  if (rate >= healthy) return StatusTone.success;
  if (rate >= degraded) return StatusTone.warning;
  return StatusTone.danger;
}
