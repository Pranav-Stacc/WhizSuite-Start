import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/task_filters.dart';

String taskStatusLabel(AppLocalizations l10n, String status) => l10n.taskStatus(status);

StatusTone taskStatusTone(String status) => switch (status) {
      TaskStatuses.todo => StatusTone.neutral,
      TaskStatuses.inProgress => StatusTone.info,
      TaskStatuses.inReview => StatusTone.warning,
      TaskStatuses.done => StatusTone.success,
      _ => StatusTone.neutral,
    };

String taskPriorityLabel(AppLocalizations l10n, String priority) => l10n.taskPriority(priority);

StatusTone taskPriorityTone(String priority) => switch (priority) {
      Priorities.low => StatusTone.neutral,
      Priorities.medium => StatusTone.info,
      Priorities.high => StatusTone.warning,
      Priorities.urgent => StatusTone.danger,
      _ => StatusTone.neutral,
    };

String taskScopeLabel(AppLocalizations l10n, TaskScope scope) => l10n.taskScope(scope.name);
