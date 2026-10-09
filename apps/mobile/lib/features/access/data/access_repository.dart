import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/preferences.dart';
import '../domain/access_policy.dart';

/// Loads effective permissions and keeps the last known set per membership for offline use.
class AccessRepository {
  const AccessRepository(this._api, this._prefs);

  static const _cachePrefix = 'access.capabilities.';

  final ApiClient _api;
  final SharedPreferences _prefs;

  Future<AccessPolicy> fetch(String membershipId) async {
    final response = await _api.get<Json>('v1/access/capabilities');
    final capabilities = response['capabilities'];
    final granted = capabilities is Map<String, dynamic>
        ? {for (final entry in capabilities.entries) if (entry.value == true) entry.key}
        : <String>{};
    await _prefs.setString('$_cachePrefix$membershipId', jsonEncode(granted.toList()));
    return AccessPolicy(granted);
  }

  AccessPolicy? cached(String membershipId) {
    final raw = _prefs.getString('$_cachePrefix$membershipId');
    if (raw == null) return null;
    final decoded = jsonDecode(raw);
    return decoded is List ? AccessPolicy(decoded.whereType<String>().toSet()) : null;
  }
}

final accessRepositoryProvider = Provider<AccessRepository>(
  (ref) => AccessRepository(ref.watch(apiClientProvider), ref.watch(sharedPreferencesProvider)),
);
