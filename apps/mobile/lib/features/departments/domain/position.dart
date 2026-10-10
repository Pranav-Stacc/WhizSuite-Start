import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// A position (designation) inside a department.
class Position {
  const Position({
    required this.id,
    required this.name,
    this.isHead = false,
    this.memberCount = 0,
  });

  factory Position.fromJson(Json json) => Position(
        id: json.str('id'),
        name: json.str('name'),
        isHead: json.flag('isHead'),
        memberCount: json.integerOrNull('memberCount') ?? 0,
      );

  final String id;
  final String name;
  final bool isHead;
  final int memberCount;
}
