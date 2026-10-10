import 'content.dart';

/// Library filters, applied together.
class ContentFilter {
  const ContentFilter({
    this.status,
    this.clientId,
    this.type,
    this.platform,
    this.mine = false,
  });

  final String? status;
  final String? clientId;
  final String? type;
  final String? platform;
  final bool mine;

  int get activeCount =>
      (status != null ? 1 : 0) +
      (clientId != null ? 1 : 0) +
      (type != null ? 1 : 0) +
      (platform != null ? 1 : 0) +
      (mine ? 1 : 0);

  bool matches(Content content, String? userId) =>
      (status == null || content.status == status) &&
      (clientId == null || content.clientId == clientId) &&
      (type == null || content.contentType == type) &&
      (platform == null || content.platforms.contains(platform)) &&
      (!mine || content.authorId == userId);

  ContentFilter copyWith({
    String? status,
    String? clientId,
    String? type,
    String? platform,
    bool? mine,
    bool clearStatus = false,
    bool clearClientId = false,
    bool clearType = false,
    bool clearPlatform = false,
  }) =>
      ContentFilter(
        status: clearStatus ? null : status ?? this.status,
        clientId: clearClientId ? null : clientId ?? this.clientId,
        type: clearType ? null : type ?? this.type,
        platform: clearPlatform ? null : platform ?? this.platform,
        mine: mine ?? this.mine,
      );
}
