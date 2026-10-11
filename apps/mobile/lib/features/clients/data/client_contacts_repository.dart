import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class ClientContactsRepository {
  ClientContactsRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('client-contacts');

  Future<String> create({
    required String clientId,
    required String firstName,
    String? lastName,
    String? email,
    String? phone,
    String? role,
    bool isDecisionMaker = false,
  }) async {
    final json = jsonObject(
      await _api.post<Object?>(
        _base,
        body: {
          'clientId': clientId,
          'firstName': firstName,
          if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
          if (email != null && email.isNotEmpty) 'email': email,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
          if (role != null && role.isNotEmpty) 'role': role,
          'isDecisionMaker': isDecisionMaker,
        },
      ),
    );
    return json.str('id');
  }

  Future<void> delete(String contactId) => _api.delete<Object?>('$_base/$contactId');
}

final clientContactsRepositoryProvider = Provider<ClientContactsRepository>(
  (ref) => ClientContactsRepository(ref.watch(apiClientProvider)),
);
