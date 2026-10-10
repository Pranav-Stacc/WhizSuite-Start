-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai";

-- CreateTable
CREATE TABLE "ai"."agent_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_definitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_prompt" TEXT NOT NULL,
    "tool_ids" JSONB NOT NULL DEFAULT '[]',
    "sub_agents" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_schedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "agent_definition_id" UUID,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_definition_id" UUID,
    "schedule_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "error" TEXT,
    "multi_agent" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_run_steps" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "agent_name" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "agent_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."agent_pending_actions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tool_id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_sessions_organization_id_user_id_updated_at_idx" ON "ai"."agent_sessions"("organization_id", "user_id", "updated_at");

-- CreateIndex
CREATE INDEX "agent_messages_organization_id_session_id_created_at_idx" ON "ai"."agent_messages"("organization_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_definitions_organization_id_is_active_idx" ON "ai"."agent_definitions"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "agent_schedules_organization_id_status_next_run_at_idx" ON "ai"."agent_schedules"("organization_id", "status", "next_run_at");

-- CreateIndex
CREATE INDEX "agent_runs_organization_id_status_created_at_idx" ON "ai"."agent_runs"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "agent_run_steps_organization_id_run_id_idx" ON "ai"."agent_run_steps"("organization_id", "run_id");

-- CreateIndex
CREATE INDEX "agent_pending_actions_organization_id_user_id_status_idx" ON "ai"."agent_pending_actions"("organization_id", "user_id", "status");

-- AddForeignKey
ALTER TABLE "ai"."agent_messages" ADD CONSTRAINT "agent_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai"."agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_schedules" ADD CONSTRAINT "agent_schedules_agent_definition_id_fkey" FOREIGN KEY ("agent_definition_id") REFERENCES "ai"."agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_runs" ADD CONSTRAINT "agent_runs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai"."agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_runs" ADD CONSTRAINT "agent_runs_agent_definition_id_fkey" FOREIGN KEY ("agent_definition_id") REFERENCES "ai"."agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_runs" ADD CONSTRAINT "agent_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "ai"."agent_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_run_steps" ADD CONSTRAINT "agent_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai"."agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."agent_pending_actions" ADD CONSTRAINT "agent_pending_actions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai"."agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
