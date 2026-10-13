import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';

/// Obtains a Google ID token for the API `POST /v1/auth/google` exchange.
class GoogleSignInService {
  GoogleSignInService(this._config);

  final AppConfig _config;

  Future<String> obtainIdToken() async {
    if (!_config.googleSignInEnabled || _config.googleServerClientId.isEmpty) {
      throw const ApiException(kind: ApiFailureKind.unknown);
    }
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
    } on PlatformException catch (error) {
      if (error.code == 'sign_in_canceled') {
        throw const ApiException(kind: ApiFailureKind.unknown, detail: 'cancelled');
      }
      throw ApiException(kind: ApiFailureKind.unknown, detail: error.message);
    }
  }

  Future<void> signOut() async => GoogleSignIn.instance.signOut();
}

final googleSignInServiceProvider = Provider<GoogleSignInService>((ref) {
  return GoogleSignInService(ref.watch(appConfigProvider));
});
