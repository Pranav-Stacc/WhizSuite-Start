import '../../../core/contracts/contracts.g.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class MemberDocument {
  const MemberDocument({
    required this.id,
    required this.type,
    required this.title,
    required this.status,
    required this.createdAt,
    this.templateId,
  });

  factory MemberDocument.fromJson(Json json) {
    final type = json.str('type');
    final status = json.str('status');
    return MemberDocument(
      id: json.str('id'),
      type: MemberDocumentTypes.values.contains(type) ? type : MemberDocumentTypes.other,
      title: json.str('title'),
      templateId: json.strOrNull('templateId'),
      status: MemberDocumentStatuses.values.contains(status) ? status : MemberDocumentStatuses.sent,
      createdAt: json.date('createdAt') ?? DateTime.now(),
    );
  }

  final String id;
  final String type;
  final String title;
  final String? templateId;
  final String status;
  final DateTime createdAt;
}
