import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Top-level isolate handler required by Firebase for background/terminated messages.
/// The OS still displays notification-payload messages in the tray; this keeps Firebase
/// initialised so data-only callbacks and plugin state stay consistent.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
}
