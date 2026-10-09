import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/invoices_repository.dart';
import '../domain/invoice.dart';

final invoicesProvider = FutureProvider.autoDispose<List<Invoice>>(
  (ref) => ref.watch(invoicesRepositoryProvider).list(),
);

final invoiceProvider = FutureProvider.autoDispose.family<Invoice, String>(
  (ref, id) => ref.watch(invoicesRepositoryProvider).get(id),
);

/// Suggested number for a new invoice, continuing this year's sequence.
final nextInvoiceNumberProvider = FutureProvider.autoDispose<String>((ref) async {
  final invoices = await ref.watch(invoicesProvider.future);
  return InvoiceNumbering.next(invoices.map((invoice) => invoice.number));
});

/// Invoice mutations; each refreshes every view that shows invoices.
class InvoicesActions {
  InvoicesActions(this._ref);

  final Ref _ref;

  InvoicesRepository get _repo => _ref.read(invoicesRepositoryProvider);

  Future<Invoice> create(InvoiceInput input) async {
    final invoice = await _repo.create(input);
    _invalidate();
    return invoice;
  }

  Future<void> update(String id, InvoiceInput input) async {
    await _repo.update(id, input);
    _invalidate(id);
  }

  Future<void> setStatus(String id, String status) async {
    await _repo.setStatus(id, status);
    _invalidate(id);
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    _invalidate();
  }

  void _invalidate([String? id]) {
    _ref.invalidate(invoicesProvider);
    if (id != null) _ref.invalidate(invoiceProvider(id));
  }
}

final invoicesActionsProvider = Provider<InvoicesActions>(InvoicesActions.new);
