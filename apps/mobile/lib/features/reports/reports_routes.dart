abstract final class ReportsRoutes {
  static const root = '/reports';
  static const detailParam = 'reportId';
  static const clientQuery = 'client';
  static const tabQuery = 'tab';
  static const analyticsTab = 'analytics';

  static String detail(String id) => '$root/$id';

  static String home({String? clientId, String? tab}) {
    final query = <String, String>{
      if (clientId != null && clientId.isNotEmpty) clientQuery: clientId,
      if (tab != null && tab.isNotEmpty) tabQuery: tab,
    };
    return Uri(path: root, queryParameters: query.isEmpty ? null : query).toString();
  }
}
