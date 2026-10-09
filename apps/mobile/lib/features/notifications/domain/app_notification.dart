import '../../../core/contracts/contracts.g.dart';
import '../../../core/network/api_client.dart';
import '../../../l10n/app_localizations.dart';

/// Mirrors `NotificationDto` in `packages/contracts`.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.typeKey,
    required this.title,
    required this.body,
    required this.data,
    required this.createdAt,
    this.readAt,
  });

  factory AppNotification.fromJson(Json json) => AppNotification(
        id: json['id'] as String,
        typeKey: json['typeKey'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        data: (json['data'] as Map<String, dynamic>?) ?? const {},
        readAt: DateTime.tryParse(json['readAt'] as String? ?? ''),
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  final String id;
  final String typeKey;
  final String title;
  final String body;
  final Json data;
  final DateTime? readAt;
  final DateTime createdAt;

  bool get isRead => readAt != null;

  AppNotification markedRead(DateTime at) => AppNotification(
        id: id,
        typeKey: typeKey,
        title: title,
        body: body,
        data: data,
        createdAt: createdAt,
        readAt: readAt ?? at,
      );
}

String notificationTypeLabel(AppLocalizations l10n, String typeKey) => switch (typeKey) {
      NotificationTypeKeys.taskAssigned => l10n.notificationTypeTaskAssigned,
      NotificationTypeKeys.contentApproved => l10n.notificationTypeContentApproved,
      NotificationTypeKeys.contentChangesRequested => l10n.notificationTypeContentChangesRequested,
      _ => l10n.notificationTypeOther,
    };

/// Mirrors `NotificationPreferenceDto`; channel keys come from `NotificationChannels`.
class NotificationPreference {
  const NotificationPreference({required this.typeKey, required this.channels});

  factory NotificationPreference.fromJson(Json json) {
    final raw = (json['channels'] as Map<String, dynamic>?) ?? const {};
    return NotificationPreference(
      typeKey: json['typeKey'] as String,
      channels: {for (final channel in NotificationChannels.values) channel: raw[channel] == true},
    );
  }

  final String typeKey;
  final Map<String, bool> channels;

  bool isOn(String channel) => channels[channel] ?? false;

  NotificationPreference withChannel(String channel, bool enabled) =>
      NotificationPreference(typeKey: typeKey, channels: {...channels, channel: enabled});
}
