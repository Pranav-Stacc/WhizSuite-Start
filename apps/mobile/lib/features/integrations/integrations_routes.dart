abstract final class IntegrationsRoutes {
  static const root = '/integrations';
  static const clientQuery = 'client';

  static String withClient(String clientId) =>
      Uri(path: root, queryParameters: {clientQuery: clientId}).toString();
}
