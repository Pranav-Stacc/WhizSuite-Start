abstract final class MediaRoutes {
  static const root = '/media';
  static const detailParam = 'assetId';
  static const clientQuery = 'client';

  static String detail(String id) => '$root/$id';

  static String withClient(String clientId) =>
      Uri(path: root, queryParameters: {clientQuery: clientId}).toString();
}
