import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

class AgentSession {
  const AgentSession({
    required this.id,
    this.title,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AgentSession.fromJson(Json json) => AgentSession(
        id: json.str('id'),
        title: json.strOrNull('title'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
        updatedAt: json.date('updatedAt') ?? DateTime.now(),
      );

  final String id;
  final String? title;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class AgentMessage {
  const AgentMessage({required this.id, required this.role, required this.content, required this.createdAt});

  factory AgentMessage.fromJson(Json json) => AgentMessage(
        id: json.str('id'),
        role: json.str('role'),
        content: json.str('content'),
        createdAt: json.date('createdAt') ?? DateTime.now(),
      );

  final String id;
  final String role;
  final String content;
  final DateTime createdAt;
}

class AgentSessionDetail {
  const AgentSessionDetail({
    required this.id,
    this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AgentSessionDetail.fromJson(Json json) => AgentSessionDetail(
        id: json.str('id'),
        title: json.strOrNull('title'),
        messages: json.objects('messages').map(AgentMessage.fromJson).toList(),
        createdAt: json.date('createdAt') ?? DateTime.now(),
        updatedAt: json.date('updatedAt') ?? DateTime.now(),
      );

  final String id;
  final String? title;
  final List<AgentMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class AgentPendingAction {
  const AgentPendingAction({
    required this.id,
    required this.runId,
    required this.toolId,
    required this.summary,
    required this.expiresAt,
  });

  factory AgentPendingAction.fromJson(Json json) => AgentPendingAction(
        id: json.str('id'),
        runId: json.str('runId'),
        toolId: json.str('toolId'),
        summary: json.str('summary'),
        expiresAt: json.date('expiresAt') ?? DateTime.now(),
      );

  final String id;
  final String runId;
  final String toolId;
  final String summary;
  final DateTime expiresAt;
}

/// Phase reported while the agent works, before answer text arrives.
enum AgentStreamPhase { planning, working, writing }

/// One event from `POST agent/sessions/:id/messages/stream` (SSE).
sealed class AgentStreamEvent {
  const AgentStreamEvent();

  /// Returns null for event types the UI does not render (plans, tool details).
  static AgentStreamEvent? fromJson(Json json) => switch (json.str('type')) {
        'status' => AgentStreamStatus(switch (json.str('phase')) {
            'summarizing' => AgentStreamPhase.writing,
            'executing' => AgentStreamPhase.working,
            _ => AgentStreamPhase.planning,
          }),
        'tool.start' || 'tool.result' => const AgentStreamStatus(AgentStreamPhase.working),
        'summary.delta' => AgentStreamDelta(json.str('text')),
        'done' => AgentStreamDone(json.str('response')),
        'error' => AgentStreamError(json.str('message')),
        _ => null,
      };
}

class AgentStreamStatus extends AgentStreamEvent {
  const AgentStreamStatus(this.phase);
  final AgentStreamPhase phase;
}

class AgentStreamDelta extends AgentStreamEvent {
  const AgentStreamDelta(this.text);
  final String text;
}

class AgentStreamDone extends AgentStreamEvent {
  const AgentStreamDone(this.response);
  final String response;
}

class AgentStreamError extends AgentStreamEvent {
  const AgentStreamError(this.message);
  final String message;
}
