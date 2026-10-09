import 'package:agency_os/features/billing/domain/billing.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('BillingIntervals', () {
    test('normalises common aliases', () {
      expect(BillingIntervals.normalize('Monthly'), BillingIntervals.month);
      expect(BillingIntervals.normalize('YEARLY'), BillingIntervals.year);
      expect(BillingIntervals.normalize('annual'), BillingIntervals.year);
      expect(BillingIntervals.normalize('quarter'), 'quarter');
    });
  });

  group('Entitlements.fromJson', () {
    test('reads numeric and object limits plus boolean features', () {
      final entitlements = Entitlements.fromJson({
        'seats': 10,
        'storageKb': {'max': -1},
        'clients': {'max': 25},
        'calendar': true,
        'whiteLabel': {'enabled': false},
        'support': {'enabled': true},
        'inbox': false,
      });

      expect(entitlements.limit('seats')?.max, 10);
      expect(entitlements.limit('clients')?.max, 25);
      expect(entitlements.limit('storageKb')?.isUnlimited, isTrue);
      expect(entitlements.features, ['calendar', 'support']);
      expect(entitlements.limits.map((l) => l.key).toList(), ['seats', 'clients', 'storageKb']);
    });
  });

  group('Plan pricing', () {
    test('yearlySavingPercent compares twelve months against yearly', () {
      final plan = Plan(
        id: 'p1',
        key: 'growth',
        name: 'Growth',
        prices: const [
          Price(currency: 'USD', interval: BillingIntervals.month, amountMinor: 10000),
          Price(currency: 'USD', interval: BillingIntervals.year, amountMinor: 96000),
        ],
        entitlements: const Entitlements(),
      );
      expect(plan.yearlySavingPercent, 20);
      // Yearly normalised to a month (96000 / 12) is cheaper than the monthly price.
      expect(plan.sortWeight, 8000);
    });

    test('priceFor prefers matching currency then falls back', () {
      const plan = Plan(
        id: 'p1',
        key: 'growth',
        name: 'Growth',
        prices: [
          Price(currency: 'EUR', interval: BillingIntervals.month, amountMinor: 9000),
          Price(currency: 'USD', interval: BillingIntervals.month, amountMinor: 10000),
        ],
        entitlements: Entitlements(),
      );
      expect(plan.priceFor(BillingIntervals.month, currency: 'USD')?.amountMinor, 10000);
      expect(plan.priceFor(BillingIntervals.month, currency: 'GBP')?.currency, 'EUR');
    });
  });

  group('Subscription', () {
    test('periodProgress clamps within the period', () {
      final subscription = Subscription(
        id: 's1',
        status: SubscriptionStatuses.active,
        planId: 'p1',
        planKey: 'growth',
        planName: 'Growth',
        prices: const [],
        entitlements: const Entitlements(),
        currentPeriodStart: DateTime.utc(2026, 10, 1),
        currentPeriodEnd: DateTime.utc(2026, 11, 1),
      );
      expect(subscription.periodProgress(DateTime.utc(2026, 10, 1)), 0);
      expect(subscription.periodProgress(DateTime.utc(2026, 10, 16)), closeTo(0.5, 0.02));
      expect(subscription.periodProgress(DateTime.utc(2026, 12, 1)), 1);
    });

    test('daysUntil never goes negative', () {
      expect(Subscription.daysUntil(DateTime.utc(2026, 10, 10), DateTime.utc(2026, 10, 9)), 1);
      expect(Subscription.daysUntil(DateTime.utc(2026, 10, 8), DateTime.utc(2026, 10, 9)), 0);
    });

    test('fromJson uppercases status and nests catalogue fields', () {
      final subscription = Subscription.fromJson({
        'id': 's1',
        'status': 'trialing',
        'planId': 'p1',
        'planKey': 'starter',
        'planName': 'Starter',
        'trialEndsAt': '2026-10-20T00:00:00.000Z',
        'prices': [
          {'currency': 'usd', 'interval': 'month', 'amountMinor': 1999},
        ],
        'entitlements': {'seats': 5, 'calendar': true},
      });
      expect(subscription.status, SubscriptionStatuses.trialing);
      expect(subscription.isTrialing, isTrue);
      expect(subscription.prices.single.currency, 'USD');
      expect(subscription.entitlements.limit('seats')?.max, 5);
      expect(subscription.entitlements.features, ['calendar']);
    });
  });
}
