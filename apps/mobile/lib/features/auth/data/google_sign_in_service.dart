import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';

/// Obtains a Google ID token for the API `POST /v1/auth/google` exchange.
class GoogleSignInService {
  GoogleSignInService(this._serverClientId);

  final String _serverClientId;
  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized || _serverClientId.isEmpty) return;
    await GoogleSignIn.instance.initialize(serverClientId: _serverClientId);
    _initialized = true;
  }

  Future<String> obtainIdToken() async {
    if (_serverClientId.isEmpty) {
      throw const ApiException(kind: ApiFailureKind.unknown);
    }
    await _ensureInitialized();
    try {
      final account = await GoogleSignIn.instance.authenticate(
        scopeHint: const ['email', 'profile'],
      );
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const ApiException(kind: ApiFailureKind.unauthorized);
      }
      return idToken;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        throw const ApiException(kind: ApiFailureKind.unknown, detail: 'cancelled');
      }
      throw const ApiException(kind: ApiFailureKind.unauthorized);
    }
  }

  Future<void> signOut() async {
    if (!_initialized) return;
    await GoogleSignIn.instance.signOut();
  }
}

final googleSignInServiceProvider = Provider<GoogleSignInService>((ref) {
  final config = ref.watch(appConfigProvider);
  return GoogleSignInService(config.googleServerClientId);
});
