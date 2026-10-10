# ADR 0011: LangGraph agent runtime & capability tools

- Status: Accepted
- Date: 2026-10-10

## Context

Product needs a permission- and data-scope-bound AI agent that can perform every
staff action available in the web UI, plus multi-agent orchestration, scheduling,
reminders, and MCP exposure for external tools. The existing `ai` module is stub-only;
`automation` records runs but does not execute actions.

## Decision

1. **Capability registry (Nest)** — every UI mutation/query maps to a typed tool in
   `packages/contracts` with permission keys, risk tier, and Zod input schema. Tools call
   existing domain services only; no direct Prisma from the agent path.
2. **Agent runtime (Python)** — `apps/agent` runs LangChain + LangGraph for planning,
   multi-agent handoffs, checkpoints, and scheduled graph invocations. It never touches
   the database; it calls Nest capability/MCP HTTP with a short-lived run token.
3. **Authz boundary** — agent runs as the requesting user. Nest re-validates JWT,
   permissions, and `DataScopeInterceptor` on every tool execution. High-risk writes
   require human confirmation (`AgentPendingAction`).
4. **Shared execution** — automation actions and agent tools use the same
   `CapabilityExecutorService`. Automations enqueue via BullMQ; interactive agents
   stream via Python SSE (`/v1/run/stream`) → Nest proxy → Next `/api/agent/stream`
   with markdown summaries, tool-step events, conversation history, and Redis-cached
   capability catalogs between runs.
5. **MCP** — JSON-RPC endpoint on Nest exposes the same filtered tool catalog.

## Consequences

- 100% UI parity is a measured capability matrix, implemented module-by-module.
- Python service is required for full agentic features; Nest remains system of record.
- Org admins can disable AI per org; credits/metering hook into billing later.
