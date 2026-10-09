abstract final class ApprovalsRoutes {
  static const root = '/approvals';
  static const detailParam = 'approvalId';

  static String detail(String id) => '$root/$id';
}
