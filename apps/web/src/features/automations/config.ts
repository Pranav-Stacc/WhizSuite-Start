import type { AutomationAction, AutomationTrigger } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';

export interface AutomationRecipe {
  id: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
}

/** One-click starting points shown when an automation of that trigger/action pair does not exist yet. */
export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  { id: 'client-review', trigger: 'content.submitted', action: 'notify.client', nameKey: 'automations.recipe.clientReview', descriptionKey: 'automations.recipe.clientReview.desc' },
  { id: 'approval-task', trigger: 'content.approved', action: 'create.task', nameKey: 'automations.recipe.approvalTask', descriptionKey: 'automations.recipe.approvalTask.desc' },
  { id: 'overdue-alert', trigger: 'task.overdue', action: 'notify.team', nameKey: 'automations.recipe.overdueAlert', descriptionKey: 'automations.recipe.overdueAlert.desc' },
  { id: 'dunning', trigger: 'invoice.overdue', action: 'send.email', nameKey: 'automations.recipe.dunning', descriptionKey: 'automations.recipe.dunning.desc' },
  { id: 'welcome', trigger: 'lead.won', action: 'create.task', nameKey: 'automations.recipe.welcome', descriptionKey: 'automations.recipe.welcome.desc' },
  { id: 'escalate', trigger: 'chat.message_mentioned', action: 'post.webhook', nameKey: 'automations.recipe.escalate', descriptionKey: 'automations.recipe.escalate.desc' },
];

export const RUN_LOG_LIMIT = 8;
