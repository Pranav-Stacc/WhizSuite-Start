abstract final class AgentRoutes {
  static const root = '/agent';
  static const detailParam = 'sessionId';

  static String detail(String id) => '$root/$id';
}
