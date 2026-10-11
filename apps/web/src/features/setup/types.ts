export type SetupStepId = 'roles' | 'departments' | 'client' | 'invite';

export interface SetupStep {
  id: SetupStepId;
  done: boolean;
  href: string;
  tourTarget?: string;
}

export interface SetupProgress {
  steps: SetupStep[];
  completed: number;
  total: number;
  complete: boolean;
}
