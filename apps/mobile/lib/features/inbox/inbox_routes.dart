abstract final class InboxRoutes {
  static const root = '/inbox';
  static const detailParam = 'conversationId';

  static String detail(String id) => '$root/$id';
}
