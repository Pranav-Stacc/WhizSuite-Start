import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';
import '../../auth/application/session_controller.dart';
import '../data/access_repository.dart';
import '../domain/access_policy.dart';

/// Effective permissions for the current session. Refreshed on an interval and on demand
/// (app resume, pull-to-refresh) so role edits made by an admin reach the app without re-login.
class AccessController extends AsyncNotifier<AccessPolicy> {
  @override
  Future<AccessPolicy> build() async {
    final session = await ref.watch(sessionProvider.future);
    final membershipId = session?.membershipId;
    if (membershipId == null) return const AccessPolicy.none();

    final interval = ref.watch(appConfigProvider).accessRefreshInterval;
    final timer = Timer.periodic(interval, (_) => refresh());
    ref.onDispose(timer.cancel);

    return _load(membershipId);
  }

  /// Re-fetches in the background, keeping the current policy visible while loading.
  Future<void> refresh() async {
    final membershipId = ref.read(sessionProvider).value?.membershipId;
    if (membershipId == null) return;
    final next = await AsyncValue.guard(() => _load(membershipId));
    if (ref.mounted && next.value != state.value) state = next;
  }

  Future<AccessPolicy> _load(String membershipId) async {
    final repository = ref.read(accessRepositoryProvider);
    try {
      return await repository.fetch(membershipId);
    } on ApiException catch (error) {
      final cached = repository.cached(membershipId);
      if (error.isRetryable && cached != null) return cached;
      rethrow;
    }
  }
}

final accessProvider = AsyncNotifierProvider<AccessController, AccessPolicy>(AccessController.new);

/// Synchronous view for widgets: no permissions until the policy has loaded.
final accessPolicyProvider = Provider<AccessPolicy>(
  (ref) => ref.watch(accessProvider).value ?? const AccessPolicy.none(),
);
