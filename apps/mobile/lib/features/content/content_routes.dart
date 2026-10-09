abstract final class ContentRoutes {
  static const root = '/content';
  static const detailParam = 'contentId';
  static const composeSegment = 'new';
  static const editSegment = 'edit';
  static const clientQuery = 'client';

  static String detail(String id) => '$root/$id';

  /// Composer for a new post, optionally preselecting a client.
  static String compose({String? clientId}) =>
      Uri(path: '$root/$composeSegment', queryParameters: clientId == null ? null : {clientQuery: clientId}).toString();

  static String edit(String id) => '$root/$id/$editSegment';
}
