import 'server-only';
import { automationRunsRepository, automationsRepository, type Automation, type AutomationRun } from '../data/automations.repository';

export async function listAutomations(): Promise<Automation[]> {
  const rows = await automationsRepository.list();
  return rows.sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.runs - a.runs);
}

export async function listRecentRuns(limit: number): Promise<AutomationRun[]> {
  const rows = await automationRunsRepository.list();
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export interface AutomationStats {
  active: number;
  runs: number;
  /** Percentage of runs that succeeded; undefined when nothing has run yet. */
  successRate: number | undefined;
}

export function summarizeAutomations(automations: Automation[]): AutomationStats {
  const runs = automations.reduce((total, a) => total + a.runs, 0);
  const failures = automations.reduce((total, a) => total + a.failures, 0);
  return {
    active: automations.filter((a) => a.enabled).length,
    runs,
    successRate: runs ? Math.round(((runs - failures) / runs) * 100) : undefined,
  };
}
