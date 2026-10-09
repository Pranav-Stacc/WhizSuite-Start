abstract final class TemplatesRoutes {
  static const root = '/templates';
  static const detailParam = 'templateId';

  static String detail(String id) => '$root/$id';
}
