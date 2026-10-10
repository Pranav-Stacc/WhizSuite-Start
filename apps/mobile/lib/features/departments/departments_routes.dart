abstract final class DepartmentsRoutes {
  static const root = '/departments';
  static const detailParam = 'departmentId';

  static String detail(String id) => '$root/$id';
}
