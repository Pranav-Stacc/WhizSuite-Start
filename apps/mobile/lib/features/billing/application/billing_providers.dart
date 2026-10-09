import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/billing_repository.dart';
import '../domain/billing.dart';

/// Current subscription and plan catalogue, loaded together for the billing page.
class BillingOverview {
  const BillingOverview({required this.subscription, required this.plans});

  final Subscription? subscription;

  /// Cheapest first; custom-priced plans last.
  final List<Plan> plans;

  Plan? get currentPlan {
    final planId = subscription?.planId;
    if (planId == null) return null;
    for (final plan in plans) {
      if (plan.id == planId) return plan;
    }
    return null;
  }

  /// Intervals offered anywhere in the catalogue, monthly first.
  List<String> get intervals {
    final all = {for (final plan in plans) ...plan.intervals};
    return [
      for (final interval in BillingIntervals.values)
        if (all.contains(interval)) interval,
      ...all.where((interval) => !BillingIntervals.values.contains(interval)),
    ];
  }

  /// Best yearly saving across plans, for the interval toggle hint.
  int? get bestYearlySaving {
    int? best;
    for (final plan in plans) {
      final saving = plan.yearlySavingPercent;
      if (saving != null && (best == null || saving > best)) best = saving;
    }
    return best;
  }
}

final billingOverviewProvider = FutureProvider.autoDispose<BillingOverview>((ref) async {
  final repository = ref.watch(billingRepositoryProvider);
  final subscription = repository.subscription();
  final plans = repository.plans();
  // Future.wait surfaces the first ApiException as-is and keeps the other failure handled.
  await Future.wait([subscription, plans]);
  return BillingOverview(
    subscription: await subscription,
    plans: [...await plans]..sort((a, b) => a.sortWeight.compareTo(b.sortWeight)),
  );
});
