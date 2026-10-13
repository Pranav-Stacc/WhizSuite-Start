import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Runtime configuration. Defaults target the hosted API; override any field
/// with `--dart-define` / `--dart-define-from-file=config/<env>.json`.
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.realtimeUrl,
    required this.connectTimeout,
    required this.receiveTimeout,
    required this.agentStreamTimeout,
    required this.pushEnabled,
    required this.androidNotificationChannelId,
    required this.pageSize,
    required this.accessRefreshInterval,
    required this.defaultCurrency,
    required this.googleServerClientId,
    required this.googleIosClientId,
    required this.googleSignInEnabled,
    required this.deepLinkScheme,
    required this.liveMode,
  });

  factory AppConfig.fromEnvironment() {
    const apiBaseUrlUnset = '__API_BASE_URL_UNSET__';
    const apiBaseUrlRaw = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: apiBaseUrlUnset,
    );
    const deployedApiBase = 'https://api.whizsuite.praanav.in/api';
    const deployedRealtime = 'https://api.whizsuite.praanav.in';
    const apiBaseUrl = apiBaseUrlRaw == apiBaseUrlUnset ? deployedApiBase : apiBaseUrlRaw;

    const realtimeUrlUnset = '__REALTIME_URL_UNSET__';
    const realtimeUrlRaw = String.fromEnvironment(
      'REALTIME_URL',
      defaultValue: realtimeUrlUnset,
    );
    const realtimeUrl = realtimeUrlRaw == realtimeUrlUnset ? deployedRealtime : realtimeUrlRaw;
    const connectTimeoutMs = int.fromEnvironment(
      'HTTP_CONNECT_TIMEOUT_MS',
      defaultValue: 10000,
    );
    const receiveTimeoutMs = int.fromEnvironment(
      'HTTP_RECEIVE_TIMEOUT_MS',
      defaultValue: 20000,
    );
    const agentStreamTimeoutMs = int.fromEnvironment(
      'AGENT_STREAM_TIMEOUT_MS',
      defaultValue: 180000,
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
    /// Web OAuth client ID from Firebase / Google Cloud (Android [serverClientId] for ID tokens).
    const googleServerClientId = String.fromEnvironment(
      'GOOGLE_SERVER_CLIENT_ID',
      defaultValue: '9465040813-c2o7a0t2b86tqnareuods7evo5ge355v.apps.googleusercontent.com',
    );
    const googleIosClientId = String.fromEnvironment(
      'GOOGLE_IOS_CLIENT_ID',
      defaultValue: '',
    );
    /// Parsed as string so `dart-define-from-file` JSON booleans always work.
    const googleSignInEnabledRaw = String.fromEnvironment(
      'GOOGLE_SIGN_IN_ENABLED',
      defaultValue: 'true',
    );
    const googleSignInEnabledFlag =
        googleSignInEnabledRaw != 'false' && googleSignInEnabledRaw != '0';
    const deepLinkScheme = String.fromEnvironment(
      'DEEP_LINK_SCHEME',
      defaultValue: 'whizsuite',
    );
    const liveMode = bool.fromEnvironment(
      'LIVE_MODE',
      defaultValue: true,
    );

    final problems = <String>[
      if (Uri.tryParse(apiBaseUrl)?.hasAuthority != true) 'API_BASE_URL',
      if (Uri.tryParse(realtimeUrl)?.hasAuthority != true) 'REALTIME_URL',
      if (connectTimeoutMs <= 0) 'HTTP_CONNECT_TIMEOUT_MS',
      if (receiveTimeoutMs <= 0) 'HTTP_RECEIVE_TIMEOUT_MS',
      if (agentStreamTimeoutMs <= 0) 'AGENT_STREAM_TIMEOUT_MS',
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
      agentStreamTimeout: const Duration(milliseconds: agentStreamTimeoutMs),
      pushEnabled: pushEnabled,
      androidNotificationChannelId: channelId,
      pageSize: pageSize,
      accessRefreshInterval: const Duration(seconds: accessRefreshSeconds),
      defaultCurrency: defaultCurrency,
      googleServerClientId: googleServerClientId,
      googleIosClientId: googleIosClientId,
      googleSignInEnabled: googleSignInEnabledFlag && googleServerClientId.isNotEmpty,
      deepLinkScheme: deepLinkScheme,
      liveMode: liveMode,
    );
  }

  static final _currencyCode = RegExp(r'^[A-Z]{3}$');

  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final Duration connectTimeout;
  final Duration receiveTimeout;

  /// Max idle gap between agent stream events (tool runs can be slow).
  final Duration agentStreamTimeout;
  final bool pushEnabled;
  final String androidNotificationChannelId;
  final int pageSize;
  final Duration accessRefreshInterval;

  /// ISO 4217 code used when a money value arrives without its own currency.
  final String defaultCurrency;

  /// Google OAuth web client ID; required for ID tokens on Android.
  final String googleServerClientId;

  /// iOS OAuth client ID (`GOOGLE_IOS_CLIENT_ID`); optional until Firebase iOS app is added.
  final String googleIosClientId;

  /// When false, login/register hide Google Sign-In.
  final bool googleSignInEnabled;

  /// Custom URL scheme for OAuth callbacks (`whizsuite://oauth?...`).
  final String deepLinkScheme;

  /// When true, Meta platforms use OAuth; when false, demo handle connect is allowed.
  final bool liveMode;
}

/// Overridden in `main` with the validated configuration.
final appConfigProvider = Provider<AppConfig>(
  (ref) => throw UnimplementedError('appConfigProvider must be overridden at startup'),
);
