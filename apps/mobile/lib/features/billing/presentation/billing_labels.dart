import '../../../core/formatting/formats.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';
import '../../roles/domain/humanize.dart';
import '../domain/billing.dart';

/// Kilobytes in a gigabyte, the unit large storage limits are shown in.
const _kbPerGb = 1024 * 1024;
const _bytesPerKb = 1024;

String subscriptionStatusLabel(AppLocalizations l10n, String status) => l10n.billingStatus(status);

StatusTone subscriptionStatusTone(String status) => switch (status) {
      SubscriptionStatuses.active => StatusTone.success,
      SubscriptionStatuses.trialing => StatusTone.info,
      SubscriptionStatuses.pastDue => StatusTone.warning,
      SubscriptionStatuses.canceled => StatusTone.danger,
      _ => StatusTone.neutral,
    };

String billingIntervalLabel(AppLocalizations l10n, String interval) =>
    l10n.billingInterval(selectKey(interval), humanizeKey(interval));

String billingLimitLabel(AppLocalizations l10n, String key) => l10n.billingLimit(selectKey(key), humanizeKey(key));

String billingFeatureLabel(AppLocalizations l10n, String key) => l10n.billingFeature(selectKey(key), humanizeKey(key));

/// A limit amount in its natural unit (storage as a size, everything else as a count).
String billingLimitValue(AppLocalizations l10n, AppFormats formats, String key, int value) {
  if (key != storageLimitKey) return formats.number(value);
  if (value >= _kbPerGb) return l10n.billingStorageGb(formats.number(value / _kbPerGb));
  return formats.fileSize(value * _bytesPerKb);
}

/// "Up to 10" / "Unlimited".
String billingLimitCap(AppLocalizations l10n, AppFormats formats, PlanLimit limit) {
  final max = limit.max;
  return max == null ? l10n.billingUnlimited : billingLimitValue(l10n, formats, limit.key, max);
}

/// "$49 / month".
String billingPriceLabel(AppLocalizations l10n, AppFormats formats, Price price) =>
    l10n.billingPricePer(formats.money(price.amountMinor, currency: price.currency), billingIntervalLabel(l10n, price.interval));
