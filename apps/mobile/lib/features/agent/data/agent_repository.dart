import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/agent_models.dart';

class AgentRepository {
  AgentRepository(this._api);

  final ApiClient _api;

  String _agent(String resource) => _api.org('agent/$resource');

  Future<List<AgentSession>> sessions() async =>
      jsonList(await _api.get<Object?>(_agent('sessions'))).map(AgentSession.fromJson).toList();

  Future<AgentSession> createSession({String? title}) async => AgentSession.fromJson(
        jsonObject(await _api.post<Object?>(_agent('sessions'), body: {if (title != null) 'title': title})),
      );

  Future<AgentSessionDetail> session(String sessionId) async =>
      AgentSessionDetail.fromJson(jsonObject(await _api.get<Object?>(_agent('sessions/$sessionId'))));

  Future<String> sendMessage(String sessionId, String message, {bool multiAgent = true}) async {
    final result = jsonObject(
      await _api.post<Object?>(
        _agent('sessions/$sessionId/messages'),
        body: {'message': message, 'multiAgent': multiAgent},
      ),
    );
    return result.str('response');
  }

  Future<List<AgentPendingAction>> pending() async =>
      jsonList(await _api.get<Object?>(_agent('pending'))).map(AgentPendingAction.fromJson).toList();

  Future<void> confirmPending(String pendingId) => _api.post<Object?>(_agent('pending/$pendingId/confirm'));

  Future<void> rejectPending(String pendingId) => _api.post<Object?>(_agent('pending/$pendingId/reject'));

  Future<List<CapabilityTool>> capabilities() async =>
      jsonList(await _api.get<Object?>(_api.org('capabilities'))).map(CapabilityTool.fromJson).toList();
}

final agentRepositoryProvider = Provider<AgentRepository>(
  (ref) => AgentRepository(ref.watch(apiClientProvider)),
);
