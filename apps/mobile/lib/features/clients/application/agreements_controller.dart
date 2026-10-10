import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/agreements_repository.dart';
import '../domain/agreement.dart';

final clientAgreementsProvider = FutureProvider.autoDispose.family<List<Agreement>, String>(
  (ref, clientId) => ref.watch(agreementsRepositoryProvider).list(clientId),
);

class AgreementsActions {
  AgreementsActions(this._ref);

  final Ref _ref;

  AgreementsRepository get _repo => _ref.read(agreementsRepositoryProvider);

  Future<Agreement> create(AgreementInput input) async {
    final agreement = await _repo.create(input);
    _ref.invalidate(clientAgreementsProvider(input.clientId));
    return agreement;
  }

  Future<Agreement> markSigned(String clientId, String id) async {
    final agreement = await _repo.markSigned(id);
    _ref.invalidate(clientAgreementsProvider(clientId));
    return agreement;
  }

  Future<Agreement> sign(String clientId, String id, {required String signerName}) async {
    final agreement = await _repo.sign(id, signerName: signerName);
    _ref.invalidate(clientAgreementsProvider(clientId));
    return agreement;
  }

  Future<Agreement> uploadPdf(
    String clientId,
    String id, {
    required String filename,
    required Uint8List bytes,
  }) async {
    final ticket = await _repo.presignUpload(id, filename: filename, sizeBytes: bytes.length);
    await _repo.uploadPdf(ticket.uploadUrl, ticket.headers, bytes);
    final agreement = await _repo.completeUpload(id);
    _ref.invalidate(clientAgreementsProvider(clientId));
    return agreement;
  }

  Future<Uri> downloadUrl(String id) => _repo.downloadUrl(id);
}

final agreementsActionsProvider = Provider<AgreementsActions>((ref) => AgreementsActions(ref));
