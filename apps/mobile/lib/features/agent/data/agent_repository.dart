import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';
import '../domain/agent_models.dart';

class AgentRepository {
  AgentRepository(this._api, this._streamTimeout);

  final ApiClient _api;
  final Duration _streamTimeout;

  String _agent(String resource) => _api.org('agent/$resource');

  Future<List<AgentSession>> sessions() async =>
      jsonList(await _api.get<Object?>(_agent('sessions'))).map(AgentSession.fromJson).toList();

  Future<AgentSession> createSession({String? title}) async => AgentSession.fromJson(
        jsonObject(await _api.post<Object?>(_agent('sessions'), body: {'title': ?title})),
      );

  Future<AgentSessionDetail> session(String sessionId) async =>
      AgentSessionDetail.fromJson(jsonObject(await _api.get<Object?>(_agent('sessions/$sessionId'))));

  /// Sends a message and streams the run: status updates, answer deltas, then done/error.
  Stream<AgentStreamEvent> streamMessage(String sessionId, String message) => _api
      .postEvents(
        _agent('sessions/$sessionId/messages/stream'),
        body: {'message': message},
        idleTimeout: _streamTimeout,
      )
      .map(AgentStreamEvent.fromJson)
      .where((event) => event != null)
      .cast<AgentStreamEvent>();

  Future<List<AgentPendingAction>> pending() async =>
      jsonList(await _api.get<Object?>(_agent('pending'))).map(AgentPendingAction.fromJson).toList();

  Future<void> confirmPending(String pendingId) => _api.post<Object?>(_agent('pending/$pendingId/confirm'));

  Future<void> rejectPending(String pendingId) => _api.post<Object?>(_agent('pending/$pendingId/reject'));
}

final agentRepositoryProvider = Provider<AgentRepository>(
  (ref) => AgentRepository(
    ref.watch(apiClientProvider),
    ref.watch(appConfigProvider).agentStreamTimeout,
  ),
);
