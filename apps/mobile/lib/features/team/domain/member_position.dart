import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A department position held by a member.
class MemberPosition {
  const MemberPosition({
    required this.id,
    required this.name,
    required this.departmentId,
    required this.departmentName,
    this.isHead = false,
    this.isPrimary = false,
  });

  factory MemberPosition.fromJson(Json json) => MemberPosition(
        id: json.str('id'),
        name: json.str('name'),
        departmentId: json.str('departmentId'),
        departmentName: json.str('departmentName'),
        isHead: json.flag('isHead'),
        isPrimary: json.flag('isPrimary'),
      );

  final String id;
  final String name;
  final String departmentId;
  final String departmentName;
  final bool isHead;
  final bool isPrimary;
}
