import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';

/// Public OAuth settings from `GET /v1/auth/oauth-config`.
class AuthOAuthConfig {
  const AuthOAuthConfig({required this.googleEnabled, this.googleWebClientId});

  factory AuthOAuthConfig.fromJson(Map<String, dynamic> json) {
    final google = json['google'];
    if (google is! Map<String, dynamic>) {
      return const AuthOAuthConfig(googleEnabled: false);
    }
    final webId = google['webClientId'];
    return AuthOAuthConfig(
      googleEnabled: google['enabled'] == true,
      googleWebClientId: webId is String && webId.isNotEmpty ? webId : null,
    );
  }

  final bool googleEnabled;
  final String? googleWebClientId;
}

final authOAuthConfigProvider = FutureProvider<AuthOAuthConfig>((ref) async {
  try {
    final body = await ref.read(apiClientProvider).getUnauthenticated<Object?>('v1/auth/oauth-config');
    if (body is! Map<String, dynamic>) {
      return const AuthOAuthConfig(googleEnabled: false);
    }
    return AuthOAuthConfig.fromJson(body);
  } catch (_) {
    return const AuthOAuthConfig(googleEnabled: false);
  }
});
