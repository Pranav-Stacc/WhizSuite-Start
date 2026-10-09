import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/conversation.dart';

class InboxRepository {
  InboxRepository(this._api);

  final ApiClient _api;

  String get _base => _api.org('inbox/conversations');

  Future<List<InboxConversation>> list() async =>
      jsonList(await _api.get<Object?>(_base)).map(InboxConversation.fromJson).toList();

  Future<InboxConversation> get(String id) async =>
      InboxConversation.fromJson(jsonObject(await _api.get<Object?>('$_base/$id')));

  Future<InboxConversation> update(String id, ConversationChange change) async =>
      InboxConversation.fromJson(jsonObject(await _api.patch<Object?>('$_base/$id', body: change.toJson())));

  Future<InboxConversation> reply(String id, String body) async =>
      InboxConversation.fromJson(jsonObject(await _api.post<Object?>('$_base/$id/replies', body: {'body': body})));
}

final inboxRepositoryProvider = Provider<InboxRepository>((ref) => InboxRepository(ref.watch(apiClientProvider)));
