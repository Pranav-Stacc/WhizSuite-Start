abstract final class ContentRoutes {
  static const root = '/content';
  static const detailParam = 'contentId';
  static const composeSegment = 'new';
  static const editSegment = 'edit';
  static const clientQuery = 'client';
  static const tabQuery = 'tab';
  static const scheduledAtQuery = 'scheduledAt';
  static const plannerTab = 'planner';

  /// Web app origin used for copy-link / share (override with `--dart-define=WEB_APP_URL=`).
  static const webAppUrl = String.fromEnvironment('WEB_APP_URL', defaultValue: 'https://whizsuite.praanav.in');

  static String detail(String id) => '$root/$id';

  /// Absolute web URL for a post — same path as the Next.js content detail page.
  static String shareUrl(String id) => Uri.parse(webAppUrl).resolve('$root/$id').toString();

  /// Composer for a new post, optionally preselecting a client and schedule.
  static String compose({String? clientId, DateTime? scheduledAt}) {
    final query = <String, String>{
      if (clientId != null && clientId.isNotEmpty) clientQuery: clientId,
      if (scheduledAt != null) scheduledAtQuery: scheduledAt.toUtc().toIso8601String(),
    };
    return Uri(path: '$root/$composeSegment', queryParameters: query.isEmpty ? null : query).toString();
  }

  static String edit(String id) => '$root/$id/$editSegment';

  /// Library or planner, optionally scoped to a client.
  static String home({String? clientId, String? tab}) {
    final query = <String, String>{
      if (clientId != null && clientId.isNotEmpty) clientQuery: clientId,
      if (tab != null && tab.isNotEmpty) tabQuery: tab,
    };
    return Uri(path: root, queryParameters: query.isEmpty ? null : query).toString();
  }
}
