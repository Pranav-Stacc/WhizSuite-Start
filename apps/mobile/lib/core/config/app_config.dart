import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Runtime configuration. Defaults target the hosted API; override any field
/// with `--dart-define` / `--dart-define-from-file=config/<env>.json`.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.realtimeUrl,
    required this.connectTimeout,
    required this.receiveTimeout,
    required this.pushEnabled,
    required this.androidNotificationChannelId,
    required this.pageSize,
    required this.accessRefreshInterval,
    required this.defaultCurrency,
    required this.googleServerClientId,
  });

  factory AppConfig.fromEnvironment() {
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://api.whizsuite.praanav.in/api',
    );
    const realtimeUrl = String.fromEnvironment(
      'REALTIME_URL',
      defaultValue: 'https://api.whizsuite.praanav.in',
    );
    const connectTimeoutMs = int.fromEnvironment(
      'HTTP_CONNECT_TIMEOUT_MS',
      defaultValue: 10000,
    );
    const receiveTimeoutMs = int.fromEnvironment(
      'HTTP_RECEIVE_TIMEOUT_MS',
      defaultValue: 20000,
    );
    const pushEnabled = bool.fromEnvironment(
      'PUSH_ENABLED',
      defaultValue: false,
    );
    const channelId = String.fromEnvironment(
      'PUSH_ANDROID_CHANNEL_ID',
      defaultValue: 'whizsuite_default',
    );
    const pageSize = int.fromEnvironment(
      'PAGE_SIZE',
      defaultValue: 25,
    );
    const accessRefreshSeconds = int.fromEnvironment(
      'ACCESS_REFRESH_INTERVAL_SECONDS',
      defaultValue: 300,
    );
    const defaultCurrency = String.fromEnvironment(
      'DEFAULT_CURRENCY',
      defaultValue: 'INR',
    );
    /// Web OAuth client ID from Firebase / Google Cloud (used as Android serverClientId).
    const googleServerClientId = String.fromEnvironment(
      'GOOGLE_SERVER_CLIENT_ID',
      defaultValue: '9465040813-c2o7a0t2b86tqnareuods7evo5ge355v.apps.googleusercontent.com',
    );

    final problems = <String>[
      if (Uri.tryParse(apiBaseUrl)?.hasAuthority != true) 'API_BASE_URL',
      if (Uri.tryParse(realtimeUrl)?.hasAuthority != true) 'REALTIME_URL',
      if (connectTimeoutMs <= 0) 'HTTP_CONNECT_TIMEOUT_MS',
      if (receiveTimeoutMs <= 0) 'HTTP_RECEIVE_TIMEOUT_MS',
      if (channelId.isEmpty) 'PUSH_ANDROID_CHANNEL_ID',
      if (pageSize <= 0) 'PAGE_SIZE',
      if (accessRefreshSeconds <= 0) 'ACCESS_REFRESH_INTERVAL_SECONDS',
      if (!_currencyCode.hasMatch(defaultCurrency)) 'DEFAULT_CURRENCY',
    ];
    if (problems.isNotEmpty) {
      throw StateError(
        'Invalid app configuration: ${problems.join(', ')}. '
        'Check defaults in AppConfig or override with --dart-define-from-file.',
      );
    }

    return AppConfig(
      apiBaseUrl: Uri.parse(apiBaseUrl.endsWith('/') ? apiBaseUrl : '$apiBaseUrl/'),
      realtimeUrl: Uri.parse(realtimeUrl),
      connectTimeout: const Duration(milliseconds: connectTimeoutMs),
      receiveTimeout: const Duration(milliseconds: receiveTimeoutMs),
      pushEnabled: pushEnabled,
      androidNotificationChannelId: channelId,
      pageSize: pageSize,
      accessRefreshInterval: const Duration(seconds: accessRefreshSeconds),
      defaultCurrency: defaultCurrency,
      googleServerClientId: googleServerClientId,
    );
  }

  static final _currencyCode = RegExp(r'^[A-Z]{3}$');

  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final Duration connectTimeout;
  final Duration receiveTimeout;
  final bool pushEnabled;
  final String androidNotificationChannelId;
  final int pageSize;
  final Duration accessRefreshInterval;

  /// ISO 4217 code used when a money value arrives without its own currency.
  final String defaultCurrency;

  /// Google OAuth web client ID; required for ID tokens on Android.
  final String googleServerClientId;

  bool get googleSignInEnabled => googleServerClientId.isNotEmpty;
}

/// Overridden in `main` with the validated configuration.
final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider must be overridden at startup'),
);
