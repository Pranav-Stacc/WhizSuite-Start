abstract final class MediaRoutes {
  static const root = '/media';
  static const detailParam = 'assetId';

  static String detail(String id) => '$root/$id';
}
