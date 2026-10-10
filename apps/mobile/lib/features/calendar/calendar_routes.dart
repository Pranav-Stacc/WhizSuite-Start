abstract final class CalendarRoutes {
  static const root = '/calendar';
  static const clientQuery = 'client';

  /// Calendar filtered to a client, e.g. from Manage deep links.
  static String withClient(String clientId) =>
      Uri(path: root, queryParameters: {clientQuery: clientId}).toString();
}
