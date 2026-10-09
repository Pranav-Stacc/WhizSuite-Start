import '../../../core/contracts/contracts.g.dart';

/// One-tap starting point offered until an automation with the same trigger/action exists (web parity).
class AutomationRecipe {
  const AutomationRecipe({required this.id, required this.trigger, required this.action});

  /// Stable id, also the l10n select key for the recipe's name and description.
  final String id;
  final String trigger;
  final String action;
}

const automationRecipes = [
  AutomationRecipe(id: 'clientReview', trigger: AutomationTriggers.contentSubmitted, action: AutomationActions.notifyClient),
  AutomationRecipe(id: 'approvalTask', trigger: AutomationTriggers.contentApproved, action: AutomationActions.createTask),
  AutomationRecipe(id: 'overdueAlert', trigger: AutomationTriggers.taskOverdue, action: AutomationActions.notifyTeam),
  AutomationRecipe(id: 'dunning', trigger: AutomationTriggers.invoiceOverdue, action: AutomationActions.sendEmail),
  AutomationRecipe(id: 'welcome', trigger: AutomationTriggers.leadWon, action: AutomationActions.createTask),
  AutomationRecipe(id: 'escalate', trigger: AutomationTriggers.chatMessageMentioned, action: AutomationActions.postWebhook),
];
