import '../../../core/network/api_client.dart';

/// Mirrors `ProfileDto` in `packages/contracts`.
class Profile {
  const Profile({required this.id, required this.email, this.firstName, this.lastName, this.jobTitle});

  factory Profile.fromJson(Json json) => Profile(
        id: json['id'] as String,
        email: json['email'] as String,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        jobTitle: json['jobTitle'] as String?,
      );

  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? jobTitle;

  String get displayName {
    final full = [firstName, lastName].whereType<String>().where((s) => s.isNotEmpty).join(' ');
    return full.isEmpty ? email : full;
  }

  String get initials {
    final source = displayName.trim();
    final parts = source.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    return parts.map((p) => p[0].toUpperCase()).join();
  }
}
