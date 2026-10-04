import 'server-only';
import { workflowsRepository, type Workflow } from '../data/workflows.repository';

export async function listWorkflows(): Promise<Workflow[]> {
  const rows = await workflowsRepository.list();
  return rows.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}
