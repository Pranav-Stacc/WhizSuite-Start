abstract final class RolesRoutes {
  static const root = '/roles';
  static const detailParam = 'roleId';
  static const createSegment = 'new';
  static const templateQuery = 'from';
  static const create = '$root/$createSegment';

  static String detail(String id) => '$root/$id';

  /// New custom role prefilled from an existing role's permissions.
  static String duplicate(String id) => Uri(path: create, queryParameters: {templateQuery: id}).toString();
}
