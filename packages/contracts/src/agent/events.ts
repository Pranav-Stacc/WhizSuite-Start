export const AgentEventTypes = {
  AGENT_RUN_STARTED: 'agent.run_started.v1',
  AGENT_RUN_COMPLETED: 'agent.run_completed.v1',
  AGENT_RUN_FAILED: 'agent.run_failed.v1',
  AGENT_PENDING_ACTION: 'agent.pending_action.v1',
  AGENT_SCHEDULE_TRIGGERED: 'agent.schedule_triggered.v1',
} as const;
