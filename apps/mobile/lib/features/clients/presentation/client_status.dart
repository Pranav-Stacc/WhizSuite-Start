import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

String clientStatusLabel(AppLocalizations l10n, String status) => l10n.clientStatus(status);

StatusTone clientStatusTone(String status) => switch (status) {
      ClientStatuses.active => StatusTone.success,
      ClientStatuses.onboarding => StatusTone.info,
      ClientStatuses.paused => StatusTone.warning,
      ClientStatuses.churned => StatusTone.danger,
      _ => StatusTone.neutral,
    };
