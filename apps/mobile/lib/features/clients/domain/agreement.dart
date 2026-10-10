import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Contract / agreement types mirrored from `@agency-os/contracts`.
abstract final class AgreementTypes {
  static const nda = 'NDA';
  static const msa = 'MSA';
  static const sow = 'SOW';
  static const other = 'OTHER';
  static const values = [nda, msa, sow, other];
}

abstract final class AgreementStatuses {
  static const draft = 'DRAFT';
  static const sent = 'SENT';
  static const signed = 'SIGNED';
  static const active = 'ACTIVE';
  static const expired = 'EXPIRED';
  static const voided = 'VOID';
}

class Agreement {
  const Agreement({
    required this.id,
    required this.clientId,
    required this.title,
    required this.type,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.startDate,
    this.endDate,
    this.signedAt,
    this.storageKey,
    this.signedStorageKey,
    this.contentHash,
    this.signatureName,
    this.signatureMethod,
  });

  factory Agreement.fromJson(Json json) => Agreement(
        id: json.str('id'),
        clientId: json.str('clientId'),
        title: json.str('title'),
        type: json.str('type', AgreementTypes.other),
        status: json.str('status', AgreementStatuses.draft),
        startDate: json.strOrNull('startDate'),
        endDate: json.strOrNull('endDate'),
        signedAt: json.date('signedAt'),
        storageKey: json.strOrNull('storageKey'),
        signedStorageKey: json.strOrNull('signedStorageKey'),
        contentHash: json.strOrNull('contentHash'),
        signatureName: json.strOrNull('signatureName'),
        signatureMethod: json.strOrNull('signatureMethod'),
        createdAt: json.date('createdAt') ?? DateTime.fromMillisecondsSinceEpoch(0),
        updatedAt: json.date('updatedAt') ?? DateTime.fromMillisecondsSinceEpoch(0),
      );

  final String id;
  final String clientId;
  final String title;
  final String type;
  final String status;
  final String? startDate;
  final String? endDate;
  final DateTime? signedAt;
  final String? storageKey;
  final String? signedStorageKey;
  final String? contentHash;
  final String? signatureName;
  final String? signatureMethod;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get hasPdf => (storageKey ?? signedStorageKey) != null;
  bool get isSigned =>
      status == AgreementStatuses.signed ||
      status == AgreementStatuses.active ||
      signedAt != null;
}

class AgreementInput {
  const AgreementInput({
    required this.clientId,
    required this.title,
    required this.type,
    this.startDate,
    this.endDate,
  });

  final String clientId;
  final String title;
  final String type;
  final String? startDate;
  final String? endDate;

  Json toJson() => {
        'clientId': clientId,
        'title': title,
        'type': type,
        if (startDate != null && startDate!.isNotEmpty) 'startDate': startDate,
        if (endDate != null && endDate!.isNotEmpty) 'endDate': endDate,
      };
}
