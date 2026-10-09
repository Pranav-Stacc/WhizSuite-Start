import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/application/session_controller.dart';
import '../domain/profile.dart';

class ProfileRepository {
  const ProfileRepository(this._api);

  final ApiClient _api;

  Future<Profile> fetch() async => Profile.fromJson(await _api.get<Json>('v1/me'));

  Future<Profile> update({String? firstName, String? lastName, String? jobTitle}) async => Profile.fromJson(
        await _api.patch<Json>('v1/me', body: {
          'firstName': ?firstName,
          'lastName': ?lastName,
          'jobTitle': ?jobTitle,
        }),
      );
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) => ProfileRepository(ref.watch(apiClientProvider)));

/// The signed-in user's profile; re-fetched when the session changes.
final profileProvider = FutureProvider<Profile?>((ref) async {
  final session = await ref.watch(sessionProvider.future);
  if (session == null) return null;
  return ref.watch(profileRepositoryProvider).fetch();
});
