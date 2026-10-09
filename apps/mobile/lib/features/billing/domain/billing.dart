import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

abstract final class SubscriptionStatuses {
  static const trialing = 'TRIALING';
  static const active = 'ACTIVE';
  static const pastDue = 'PAST_DUE';
  static const canceled = 'CANCELED';

  static const values = [trialing, active, pastDue, canceled];
}

/// Normalised billing intervals; the API stores free text such as `month` or `monthly`.
abstract final class BillingIntervals {
  static const month = 'month';
  static const year = 'year';

  static const values = [month, year];
  static const monthsPerYear = 12;

  static const _aliases = {
    'month': month,
    'monthly': month,
    'year': year,
    'yearly': year,
    'annual': year,
    'annually': year,
  };

  static String normalize(String raw) => _aliases[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();
}

/// Plan limits in the order the web shows them; other keys follow alphabetically.
const knownLimitKeys = ['seats', 'clients', 'channels', 'storageKb', 'automationRuns'];

/// Plan features in the order the web shows them; other keys follow alphabetically.
const knownFeatureKeys = ['calendar', 'approvals', 'inbox', 'invoices', 'reports', 'whiteLabel', 'support'];

/// Limit measured in kilobytes, shown as a file size.
const storageLimitKey = 'storageKb';

class Price {
  const Price({required this.currency, required this.interval, required this.amountMinor});

  factory Price.fromJson(Json json) => Price(
        currency: json.str('currency').toUpperCase(),
        interval: BillingIntervals.normalize(json.str('interval')),
        amountMinor: json.integer('amountMinor'),
      );

  final String currency;
  final String interval;
  final int amountMinor;
}

/// A numeric cap; [max] is null when the plan does not cap it.
class PlanLimit {
  const PlanLimit({required this.key, this.max});

  final String key;
  final int? max;

  bool get isUnlimited => max == null;
}

/// A plan entitlement split into numeric limits and on/off features.
class Entitlements {
  const Entitlements({this.limits = const [], this.features = const []});

  /// Reads `{key: value}` where value is a number or `{max}` (limit), or a bool or `{enabled}` (feature),
  /// matching how the API's `checkLimit` / `hasFeature` interpret them.
  factory Entitlements.fromJson(Json? json) {
    if (json == null) return const Entitlements();
    final limits = <PlanLimit>[];
    final features = <String>[];
    for (final MapEntry(:key, :value) in json.entries) {
      switch (value) {
        case num():
          limits.add(PlanLimit(key: key, max: value < 0 ? null : value.toInt()));
        case bool():
          if (value) features.add(key);
        case Map() when value.containsKey('max'):
          final max = value['max'];
          limits.add(PlanLimit(key: key, max: max is num && max >= 0 ? max.toInt() : null));
        case Map():
          if (value['enabled'] != false) features.add(key);
      }
    }
    limits.sort((a, b) => _compareKnown(knownLimitKeys, a.key, b.key));
    features.sort((a, b) => _compareKnown(knownFeatureKeys, a, b));
    return Entitlements(limits: limits, features: features);
  }

  final List<PlanLimit> limits;
  final List<String> features;

  PlanLimit? limit(String key) {
    for (final limit in limits) {
      if (limit.key == key) return limit;
    }
    return null;
  }

  bool get isEmpty => limits.isEmpty && features.isEmpty;
}

int _compareKnown(List<String> known, String a, String b) {
  final ia = known.indexOf(a);
  final ib = known.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia.compareTo(ib);
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.toLowerCase().compareTo(b.toLowerCase());
}

/// Shared catalogue fields of plans and subscriptions.
mixin PricedCatalogue {
  List<Price> get prices;

  /// Price billed per [interval], preferring [currency] when given.
  Price? priceFor(String interval, {String? currency}) {
    Price? fallback;
    for (final price in prices) {
      if (price.interval != interval) continue;
      if (currency == null || price.currency == currency) return price;
      fallback ??= price;
    }
    return fallback;
  }

  Set<String> get intervals => {for (final price in prices) price.interval};

  /// Whole-percent saving of yearly over twelve monthly payments, when both exist in one currency.
  int? get yearlySavingPercent {
    final monthly = priceFor(BillingIntervals.month);
    final yearly = monthly == null ? null : priceFor(BillingIntervals.year, currency: monthly.currency);
    if (monthly == null || yearly == null || monthly.amountMinor <= 0 || yearly.currency != monthly.currency) {
      return null;
    }
    final full = monthly.amountMinor * BillingIntervals.monthsPerYear;
    const hundred = 100;
    final percent = ((full - yearly.amountMinor) * hundred / full).round();
    return percent > 0 ? percent : null;
  }
}

class Plan with PricedCatalogue {
  const Plan({
    required this.id,
    required this.key,
    required this.name,
    required this.prices,
    required this.entitlements,
    this.description,
  });

  factory Plan.fromJson(Json json) => Plan(
        id: json.str('id'),
        key: json.str('key'),
        name: json.str('name'),
        description: json.strOrNull('description'),
        prices: json.objects('prices').map(Price.fromJson).toList(),
        entitlements: Entitlements.fromJson(json.object('entitlements')),
      );

  final String id;
  final String key;
  final String name;
  final String? description;
  @override
  final List<Price> prices;
  final Entitlements entitlements;

  /// Custom-priced plans sort after every priced one.
  static const _unpricedWeight = 1 << 31;

  /// Lowest amount across intervals normalised to a month, for ordering the catalogue.
  int get sortWeight {
    var best = -1;
    for (final price in prices) {
      final monthly =
          price.interval == BillingIntervals.year ? price.amountMinor ~/ BillingIntervals.monthsPerYear : price.amountMinor;
      if (best < 0 || monthly < best) best = monthly;
    }
    return best < 0 ? _unpricedWeight : best;
  }
}

class Subscription with PricedCatalogue {
  const Subscription({
    required this.id,
    required this.status,
    required this.planId,
    required this.planKey,
    required this.planName,
    required this.prices,
    required this.entitlements,
    this.trialEndsAt,
    this.currentPeriodStart,
    this.currentPeriodEnd,
  });

  factory Subscription.fromJson(Json json) => Subscription(
        id: json.str('id'),
        status: json.str('status').toUpperCase(),
        planId: json.str('planId'),
        planKey: json.str('planKey'),
        planName: json.str('planName'),
        trialEndsAt: json.date('trialEndsAt'),
        currentPeriodStart: json.date('currentPeriodStart'),
        currentPeriodEnd: json.date('currentPeriodEnd'),
        prices: json.objects('prices').map(Price.fromJson).toList(),
        entitlements: Entitlements.fromJson(json.object('entitlements')),
      );

  final String id;
  final String status;
  final String planId;
  final String planKey;
  final String planName;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodStart;
  final DateTime? currentPeriodEnd;
  @override
  final List<Price> prices;
  final Entitlements entitlements;

  bool get isTrialing => status == SubscriptionStatuses.trialing;
  bool get isCanceled => status == SubscriptionStatuses.canceled;
  bool get needsAttention => status == SubscriptionStatuses.pastDue;

  /// Share of the current billing period elapsed, 0–1; null without period dates.
  double? periodProgress([DateTime? now]) {
    final start = currentPeriodStart;
    final end = currentPeriodEnd;
    if (start == null || end == null || !end.isAfter(start)) return null;
    final elapsed = (now ?? DateTime.now()).difference(start).inSeconds / end.difference(start).inSeconds;
    return elapsed.clamp(0, 1).toDouble();
  }

  /// Whole days until [date], never negative.
  static int daysUntil(DateTime date, [DateTime? now]) {
    final hours = date.difference(now ?? DateTime.now()).inHours;
    return hours <= 0 ? 0 : (hours / Duration.hoursPerDay).ceil();
  }
}
