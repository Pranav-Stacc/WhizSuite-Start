abstract final class InvoicesRoutes {
  static const root = '/invoices';
  static const detailParam = 'invoiceId';
  static const createSegment = 'new';
  static const editSegment = 'edit';
  static const clientQuery = 'client';

  static const create = '$root/$createSegment';

  static String detail(String id) => '$root/$id';

  static String edit(String id) => '$root/$id/$editSegment';

  static String withClient(String clientId) =>
      Uri(path: root, queryParameters: {clientQuery: clientId}).toString();
}
