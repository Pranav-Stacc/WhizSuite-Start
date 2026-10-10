abstract final class MessagesRoutes {
  static const root = '/messages';
  static const detailParam = 'threadId';
  static const whiz = '/messages/whiz';

  static String detail(String id) => '$root/$id';

  /// Opens a client room directly (parity with web `clients/[id]/messages`).
  static String clientRoom(String clientId) => '$root?clientId=$clientId';
}
