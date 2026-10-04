import 'server-only';
import { LeadStages, leadsRepository, type Lead, type LeadStage } from '../data/leads.repository';

export async function listLeads(): Promise<Lead[]> {
  return leadsRepository.list();
}

/** Probability of closing by stage — used for the weighted pipeline forecast. */
export const STAGE_WEIGHT: Record<LeadStage, number> = { NEW: 0.1, CONTACTED: 0.25, PROPOSAL: 0.5, NEGOTIATION: 0.75, WON: 1, LOST: 0 };

export interface StageSummary {
  stage: LeadStage;
  count: number;
  value: number;
}

export interface PipelineSummary {
  stages: StageSummary[];
  open: number;
  weighted: number;
  won: number;
  /** Share of closed deals that were won, 0–100; undefined until a deal closes. */
  winRate: number | undefined;
}

export function summarizePipeline(leads: Lead[]): PipelineSummary {
  const wonCount = leads.filter((l) => l.stage === 'WON').length;
  const closedCount = wonCount + leads.filter((l) => l.stage === 'LOST').length;
  const stages = LeadStages.map((stage) => {
    const rows = leads.filter((l) => l.stage === stage);
    return { stage, count: rows.length, value: rows.reduce((a, l) => a + l.valueMinor, 0) };
  });
  const openLeads = leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST');
  return {
    stages,
    open: openLeads.reduce((a, l) => a + l.valueMinor, 0),
    weighted: Math.round(openLeads.reduce((a, l) => a + l.valueMinor * STAGE_WEIGHT[l.stage], 0)),
    won: leads.filter((l) => l.stage === 'WON').reduce((a, l) => a + l.valueMinor, 0),
    winRate: closedCount ? Math.round((wonCount / closedCount) * 100) : undefined,
  };
}
