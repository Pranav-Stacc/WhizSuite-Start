abstract final class AutomationsRoutes {
  static const root = '/automations';
  static const detailParam = 'automationId';

  static String detail(String id) => '$root/$id';
}
