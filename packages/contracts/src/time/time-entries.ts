export const TIME_ENTRY_LIST_LIMIT_DEFAULT = 1000;
export const TIME_ENTRY_MINUTES_MAX = 1440;
export const TIME_ENTRY_NOTE_MAX_LENGTH = 1000;

export interface TimeEntryCreateInput {
  projectId?: string;
  clientId?: string;
  taskId?: string;
  minutes: number;
  /** Day the work happened (YYYY-MM-DD or ISO timestamp). */
  date: string;
  note?: string;
  billable?: boolean;
}

export interface TimeEntryDto {
  id: string;
  userId: string | null;
  projectId: string | null;
  clientId: string | null;
  taskId: string | null;
  minutes: number;
  startedAt: string;
  note: string | null;
  billable: boolean;
  createdAt: string;
}

export interface TimerStartInput {
  taskId: string;
}

/** A timer the caller has started but not stopped yet. */
export interface RunningTimerDto {
  id: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  clientId: string | null;
  startedAt: string;
}
