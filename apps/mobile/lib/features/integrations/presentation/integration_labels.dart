import '../../../core/contracts/contracts.g.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/integration_connection.dart';

const _shortIdLength = 8;

String integrationStatusLabel(AppLocalizations l10n, String status) => l10n.integrationStatus(status);

StatusTone integrationStatusTone(String status) => switch (status) {
      IntegrationConnectionStatuses.connected => StatusTone.success,
      IntegrationConnectionStatuses.pending => StatusTone.info,
      IntegrationConnectionStatuses.error => StatusTone.danger,
      _ => StatusTone.neutral,
    };

String _shortId(String id) => id.length <= _shortIdLength ? id : id.substring(0, _shortIdLength);

/// The provider's recorded name, or a short id when the connection never stored one.
String integrationProviderLabel(AppLocalizations l10n, IntegrationConnection connection) =>
    connection.providerName ?? l10n.integrationProviderFallback(_shortId(connection.providerId));

String knownProviderLabel(AppLocalizations l10n, String providerId, String? name) =>
    name ?? l10n.integrationProviderFallback(_shortId(providerId));
