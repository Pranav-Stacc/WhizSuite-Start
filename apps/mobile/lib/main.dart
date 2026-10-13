import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'core/config/app_config.dart';
import 'core/storage/preferences.dart';
import 'features/auth/infrastructure/google_sign_in_bootstrap.dart';
import 'features/notifications/infrastructure/fcm_background.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();
  await bootstrapGoogleSignIn(config);
  if (config.pushEnabled && !kIsWeb) {
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }
  final preferences = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      // Failures surface to the UI (error states with retry) instead of silent auto-retries.
      retry: (_, _) => null,
      overrides: [
        appConfigProvider.overrideWithValue(config),
        sharedPreferencesProvider.overrideWithValue(preferences),
      ],
      child: const AgencyOsApp(),
    ),
  );
}
