import { common } from './messages/common';
import { navigation } from './messages/navigation';
import { auth } from './messages/auth';
import { dashboard } from './messages/dashboard';
import { work } from './messages/work';
import { contentMessages } from './messages/content';
import { clientsMessages } from './messages/clients';
import { chatMessages } from './messages/chat';
import { automationMessages } from './messages/automation';
import { moneyMessages } from './messages/money';
import { agencyMessages } from './messages/agency';
import { portalMessages } from './messages/portal';
import { plannerMessages } from './messages/planner';
import { legalMessages } from './messages/legal';
import { agentMessages } from './messages/agent';

export const messages = {
  ...common,
  ...navigation,
  ...auth,
  ...dashboard,
  ...work,
  ...contentMessages,
  ...clientsMessages,
  ...chatMessages,
  ...automationMessages,
  ...moneyMessages,
  ...agencyMessages,
  ...portalMessages,
  ...plannerMessages,
  ...legalMessages,
  ...agentMessages,
} as const;

export type MessageKey = keyof typeof messages;

/** Message-catalog lookup with {placeholder} interpolation. Safe in server and client components. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template: string = messages[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
