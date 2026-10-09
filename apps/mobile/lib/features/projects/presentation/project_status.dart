import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String projectStatusLabel(AppLocalizations l10n, String status) => l10n.projectStatus(status);

StatusTone projectStatusTone(String status) => switch (status) {
      ProjectStatuses.planning => StatusTone.info,
      ProjectStatuses.active => StatusTone.success,
      ProjectStatuses.onHold => StatusTone.warning,
      ProjectStatuses.completed => StatusTone.neutral,
      _ => StatusTone.neutral,
    };

StatusTone projectContentTone(String status) => switch (status) {
      ContentStatuses.draft => StatusTone.neutral,
      ContentStatuses.inReview => StatusTone.warning,
      ContentStatuses.changesRequested => StatusTone.danger,
      ContentStatuses.approved => StatusTone.success,
      ContentStatuses.scheduled => StatusTone.info,
      ContentStatuses.published => StatusTone.violet,
      _ => StatusTone.neutral,
    };
