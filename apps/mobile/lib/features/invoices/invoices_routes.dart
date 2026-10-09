abstract final class InvoicesRoutes {
  static const root = '/invoices';
  static const detailParam = 'invoiceId';
  static const createSegment = 'new';
  static const editSegment = 'edit';

  static const create = '$root/$createSegment';

  static String detail(String id) => '$root/$id';

  static String edit(String id) => '$root/$id/$editSegment';
}
