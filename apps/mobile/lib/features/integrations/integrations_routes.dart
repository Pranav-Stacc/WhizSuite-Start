abstract final class IntegrationsRoutes {
  static const root = '/integrations';
  static const clientQuery = 'client';
  static const metaQuery = 'meta';

  static String withClient(String clientId, {String? meta}) {
    final query = <String, String>{
      clientQuery: clientId,
      if (meta != null && meta.isNotEmpty) metaQuery: meta,
    };
    return Uri(path: root, queryParameters: query).toString();
  }
}
