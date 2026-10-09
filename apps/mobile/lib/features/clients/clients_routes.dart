abstract final class ClientsRoutes {
  static const root = '/clients';
  static const detailParam = 'clientId';

  static String detail(String id) => '$root/$id';
}
