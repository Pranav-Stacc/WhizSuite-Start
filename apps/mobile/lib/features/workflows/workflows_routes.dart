abstract final class WorkflowsRoutes {
  static const root = '/workflows';
  static const detailParam = 'workflowId';

  static String detail(String id) => '$root/$id';
}
