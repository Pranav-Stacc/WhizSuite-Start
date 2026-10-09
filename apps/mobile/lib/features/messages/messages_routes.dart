abstract final class MessagesRoutes {
  static const root = '/messages';
  static const detailParam = 'threadId';

  static String detail(String id) => '$root/$id';
}
