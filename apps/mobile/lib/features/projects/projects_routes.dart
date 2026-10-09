abstract final class ProjectsRoutes {
  static const root = '/projects';
  static const detailParam = 'projectId';

  static String detail(String id) => '$root/$id';
}
