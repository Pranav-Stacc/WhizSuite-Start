import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../domain/app_notification.dart';

class NotificationsRepository {
  const NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<AppNotification>> list() async {
    final rows = await _api.get<List<dynamic>>(_api.org('notifications'));
    return rows.cast<Json>().map(AppNotification.fromJson).toList();
  }

  Future<void> markRead(String id) => _api.patch<dynamic>(_api.org('notifications/$id/read'));

  Future<void> markAllRead() => _api.patch<dynamic>(_api.org('notifications/read-all'));

  Future<List<NotificationPreference>> preferences() async {
    final rows = await _api.get<List<dynamic>>(_api.org('notifications/preferences'));
    return rows.cast<Json>().map(NotificationPreference.fromJson).toList();
  }

  Future<NotificationPreference> setChannels(String typeKey, Map<String, bool> channels) async =>
      NotificationPreference.fromJson(
        await _api.put<Json>(
          _api.org('notifications/preferences/${Uri.encodeComponent(typeKey)}'),
          body: {'channels': channels},
        ),
      );

  /// Returns the server device id so the registration can be removed on sign-out.
  Future<String> registerDevice({
    required String token,
    required String platform,
    String? appVersion,
    String? locale,
  }) async {
    final response = await _api.post<Json>(
      _api.org('notifications/devices'),
      body: {'token': token, 'platform': platform, 'appVersion': ?appVersion, 'locale': ?locale},
    );
    return response['id'] as String;
  }

  Future<void> removeDevice(String deviceId) =>
      _api.delete<dynamic>(_api.org('notifications/devices/${Uri.encodeComponent(deviceId)}'));
}

final notificationsRepositoryProvider =
    Provider<NotificationsRepository>((ref) => NotificationsRepository(ref.watch(apiClientProvider)));
