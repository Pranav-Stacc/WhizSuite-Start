abstract final class LeadsRoutes {
  static const root = '/leads';
  static const detailParam = 'leadId';

  static String detail(String id) => '$root/$id';
}
