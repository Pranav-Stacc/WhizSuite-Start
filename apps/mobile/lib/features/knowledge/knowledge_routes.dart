abstract final class KnowledgeRoutes {
  static const root = '/knowledge';
  static const detailParam = 'articleId';

  static String detail(String id) => '$root/$id';
}
