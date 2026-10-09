import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Runtime configuration supplied via `--dart-define-from-file=config/<env>.json`.
/// Validated once at startup so a misconfigured build fails fast.
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
  });

  factory AppConfig.fromEnvironment() {
    const apiBaseUrl = String.fromEnvironment('API_BASE_URL');
    const realtimeUrl = String.fromEnvironment('REALTIME_URL');
    const connectTimeoutMs = int.fromEnvironment('HTTP_CONNECT_TIMEOUT_MS');
    const receiveTimeoutMs = int.fromEnvironment('HTTP_RECEIVE_TIMEOUT_MS');
    const pushEnabled = bool.fromEnvironment('PUSH_ENABLED');
    const channelId = String.fromEnvironment('PUSH_ANDROID_CHANNEL_ID');
    const pageSize = int.fromEnvironment('PAGE_SIZE');
    const accessRefreshSeconds = int.fromEnvironment('ACCESS_REFRESH_INTERVAL_SECONDS');

    final problems = <String>[
      if (Uri.tryParse(apiBaseUrl)?.hasAuthority != true) 'API_BASE_URL',
      if (Uri.tryParse(realtimeUrl)?.hasAuthority != true) 'REALTIME_URL',
      if (connectTimeoutMs <= 0) 'HTTP_CONNECT_TIMEOUT_MS',
      if (receiveTimeoutMs <= 0) 'HTTP_RECEIVE_TIMEOUT_MS',
      if (channelId.isEmpty) 'PUSH_ANDROID_CHANNEL_ID',
      if (pageSize <= 0) 'PAGE_SIZE',
      if (accessRefreshSeconds <= 0) 'ACCESS_REFRESH_INTERVAL_SECONDS',
    ];
    if (problems.isNotEmpty) {
      throw StateError(
        'Invalid app configuration: ${problems.join(', ')}. '
        'Run with --dart-define-from-file=config/dev.json (see config/dev.example.json).',
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
    );
  }

  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final Duration connectTimeout;
  final Duration receiveTimeout;
  final bool pushEnabled;
  final String androidNotificationChannelId;
  final int pageSize;
  final Duration accessRefreshInterval;
}

/// Overridden in `main` with the validated configuration.
final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider must be overridden at startup'),
);
