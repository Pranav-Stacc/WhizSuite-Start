abstract final class TasksRoutes {
  static const root = '/tasks';
  static const detailParam = 'taskId';

  static String detail(String id) => '$root/$id';
}
