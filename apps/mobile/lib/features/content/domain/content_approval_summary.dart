import '../../../core/data/json_read.dart';
import '../../../core/network/api_client.dart';

/// Current approval step for a content item (`GET content/:id/approval-summary`).
class ContentApprovalSummary {
  const ContentApprovalSummary({
    required this.requestId,
    required this.status,
    required this.currentStep,
    required this.totalSteps,
    this.dueAt,
  });

  factory ContentApprovalSummary.fromJson(Json json) {
    final step = json.object('currentStep');
    return ContentApprovalSummary(
      requestId: json.str('requestId'),
      status: json.str('status', 'PENDING'),
      dueAt: json.date('dueAt'),
      totalSteps: json.integer('totalSteps', 1),
      currentStep: step == null
          ? const ContentApprovalStep(order: 1, name: '', rule: 'ANY')
          : ContentApprovalStep.fromJson(step),
    );
  }

  final String requestId;
  final String status;
  final DateTime? dueAt;
  final ContentApprovalStep currentStep;
  final int totalSteps;
}

class ContentApprovalStep {
  const ContentApprovalStep({
    required this.order,
    required this.name,
    required this.rule,
    this.basis,
    this.approverUserIds = const [],
    this.quorumCount,
  });

  factory ContentApprovalStep.fromJson(Json json) => ContentApprovalStep(
        order: json.integer('order', 1),
        name: json.str('name'),
        rule: json.str('rule', 'ANY'),
        basis: json.strOrNull('basis'),
        approverUserIds: json.strings('approverUserIds'),
        quorumCount: json.integerOrNull('quorumCount'),
      );

  final int order;
  final String name;
  final String rule;
  final String? basis;
  final List<String> approverUserIds;
  final int? quorumCount;
}
