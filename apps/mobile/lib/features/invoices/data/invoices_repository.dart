import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/invoice.dart';

class InvoicesRepository {
  InvoicesRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('invoices');

  Future<List<Invoice>> list() async => jsonList(await _api.get<Object?>(_base)).map(Invoice.fromJson).toList();

  Future<Invoice> get(String id) async => Invoice.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<Invoice> create(InvoiceInput input) async =>
      Invoice.fromJson(jsonObject(await _api.post<Object?>(_base, body: input.toJson())));

  /// Drafts only: the API rejects content edits once an invoice is sent.
  Future<Invoice> update(String id, InvoiceInput input) async {
    final body = input.toJson()
      ..remove('number')
      ..remove('status');
    return Invoice.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: body)));
  }

  Future<Invoice> setStatus(String id, String status) async =>
      Invoice.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: {'status': status})));

  Future<void> delete(String id) => _api.delete<Object?>('$_base/$id');
}

final invoicesRepositoryProvider = Provider<InvoicesRepository>(
  (ref) => InvoicesRepository(ref.watch(apiClientProvider)),
);
