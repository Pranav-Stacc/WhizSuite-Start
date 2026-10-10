abstract final class ContentRoutes {
  static const root = '/content';
  static const detailParam = 'contentId';
  static const composeSegment = 'new';
  static const editSegment = 'edit';
  static const clientQuery = 'client';
  static const tabQuery = 'tab';
  static const plannerTab = 'planner';

  static String detail(String id) => '$root/$id';

  /// Composer for a new post, optionally preselecting a client.
  static String compose({String? clientId}) =>
      Uri(path: '$root/$composeSegment', queryParameters: clientId == null ? null : {clientQuery: clientId}).toString();

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
