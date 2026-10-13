import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/config/app_config.dart';

/// Prepares Google Sign-In before the login screen (Android needs [serverClientId] early).
Future<void> bootstrapGoogleSignIn(AppConfig config) async {
  if (!config.googleSignInEnabled || config.googleServerClientId.isEmpty) return;

  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
    } catch (error, stack) {
      debugPrint('Firebase.initializeApp skipped: $error\n$stack');
    }
  }

  await GoogleSignIn.instance.initialize(
    clientId: config.googleIosClientId.isEmpty ? null : config.googleIosClientId,
    serverClientId: config.googleServerClientId,
  );
}
