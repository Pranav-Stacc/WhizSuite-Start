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

class CapabilityTool {
  const CapabilityTool({
    required this.id,
    required this.module,
    required this.name,
    required this.description,
    required this.riskTier,
    required this.requiresConfirmation,
  });

  factory CapabilityTool.fromJson(Json json) => CapabilityTool(
        id: json.str('id'),
        module: json.str('module'),
        name: json.str('name'),
        description: json.str('description'),
        riskTier: json.str('riskTier'),
        requiresConfirmation: json.flag('requiresConfirmation'),
      );

  final String id;
  final String module;
  final String name;
  final String description;
  final String riskTier;
  final bool requiresConfirmation;
}
