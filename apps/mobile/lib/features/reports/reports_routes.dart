abstract final class ReportsRoutes {
  static const root = '/reports';
  static const detailParam = 'reportId';

  static String detail(String id) => '$root/$id';
}
