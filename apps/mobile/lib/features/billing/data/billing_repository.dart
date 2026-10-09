import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/billing.dart';

class BillingRepository {
  BillingRepository(this._api);

  final ApiClient _api;

  /// The organisation's subscription, or null when it is not on a plan (the API answers 404).
  Future<Subscription?> subscription() async {
    try {
      return Subscription.fromJson(jsonObject(await _api.get<Object?>(_api.org('billing/subscription'))));
    } on ApiException catch (error) {
      if (error.kind == ApiFailureKind.notFound) return null;
      rethrow;
    }
  }

  Future<List<Plan>> plans() async =>
      jsonList(await _api.get<Object?>(_api.org('billing/plans'))).map(Plan.fromJson).toList();
}

final billingRepositoryProvider = Provider<BillingRepository>(
  (ref) => BillingRepository(ref.watch(apiClientProvider)),
);
