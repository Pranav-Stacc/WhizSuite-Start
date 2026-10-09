-- Replace engagement inbox with scalable chat schema.

CREATE SCHEMA IF NOT EXISTS "chat";

CREATE TABLE "chat"."chat_rooms" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "avatar_asset_id" UUID,
    "client_id" UUID,
    "dm_key" TEXT,
    "created_by_id" UUID,
    "last_message_at" TIMESTAMPTZ,
    "last_message_preview" TEXT,
    "last_message_id" UUID,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat"."chat_room_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "can_post" BOOLEAN NOT NULL DEFAULT true,
    "can_add_members" BOOLEAN NOT NULL DEFAULT false,
    "can_manage" BOOLEAN NOT NULL DEFAULT false,
    "notification_level" TEXT NOT NULL DEFAULT 'ALL',
    "muted_until" TIMESTAMPTZ,
    "last_read_message_id" UUID,
    "last_read_at" TIMESTAMPTZ,
    "last_delivered_message_id" UUID,
    "pinned_at" TIMESTAMPTZ,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,

    CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat"."chat_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_id" UUID,
    "client_message_id" UUID,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL DEFAULT '',
    "reply_to_id" UUID,
    "link_preview" JSONB,
    "metadata" JSONB,
    "edited_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat"."chat_attachments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "asset_id" UUID,
    "kind" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "file_name" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat"."chat_mentions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "display_text" TEXT NOT NULL,
    "start_offset" INTEGER,
    "end_offset" INTEGER,

    CONSTRAINT "chat_mentions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat"."chat_reactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_rooms_organization_id_dm_key_key" ON "chat"."chat_rooms"("organization_id", "dm_key");
CREATE UNIQUE INDEX "chat_rooms_organization_id_client_id_key" ON "chat"."chat_rooms"("organization_id", "client_id");
CREATE INDEX "chat_rooms_organization_id_last_message_at_idx" ON "chat"."chat_rooms"("organization_id", "last_message_at" DESC);
CREATE INDEX "chat_rooms_organization_id_type_deleted_at_idx" ON "chat"."chat_rooms"("organization_id", "type", "deleted_at");

CREATE UNIQUE INDEX "chat_room_members_room_id_user_id_key" ON "chat"."chat_room_members"("room_id", "user_id");
CREATE INDEX "chat_room_members_organization_id_user_id_left_at_pinned_at_idx" ON "chat"."chat_room_members"("organization_id", "user_id", "left_at", "pinned_at");
CREATE INDEX "chat_room_members_organization_id_room_id_left_at_idx" ON "chat"."chat_room_members"("organization_id", "room_id", "left_at");

CREATE UNIQUE INDEX "chat_messages_room_id_client_message_id_key" ON "chat"."chat_messages"("room_id", "client_message_id");
CREATE INDEX "chat_messages_organization_id_room_id_created_at_id_idx" ON "chat"."chat_messages"("organization_id", "room_id", "created_at" DESC, "id" DESC);
CREATE INDEX "chat_messages_organization_id_sender_id_created_at_idx" ON "chat"."chat_messages"("organization_id", "sender_id", "created_at" DESC);

CREATE INDEX "chat_attachments_organization_id_message_id_idx" ON "chat"."chat_attachments"("organization_id", "message_id");
CREATE INDEX "chat_attachments_organization_id_asset_id_idx" ON "chat"."chat_attachments"("organization_id", "asset_id");

CREATE INDEX "chat_mentions_organization_id_message_id_idx" ON "chat"."chat_mentions"("organization_id", "message_id");
CREATE INDEX "chat_mentions_organization_id_type_target_id_idx" ON "chat"."chat_mentions"("organization_id", "type", "target_id");

CREATE UNIQUE INDEX "chat_reactions_message_id_user_id_emoji_key" ON "chat"."chat_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "chat_reactions_organization_id_message_id_idx" ON "chat"."chat_reactions"("organization_id", "message_id");

ALTER TABLE "chat"."chat_room_members" ADD CONSTRAINT "chat_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat"."chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat"."chat_attachments" ADD CONSTRAINT "chat_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat"."chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat"."chat_mentions" ADD CONSTRAINT "chat_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat"."chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat"."chat_reactions" ADD CONSTRAINT "chat_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat"."chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop engagement inbox (no data migration — product replaced).
DROP TABLE IF EXISTS "engagement"."inbox_messages";
DROP TABLE IF EXISTS "engagement"."inbox_conversations";
DROP TABLE IF EXISTS "engagement"."saved_replies";
DROP TABLE IF EXISTS "engagement"."sla_policies";
DROP SCHEMA IF EXISTS "engagement";

-- Swap inbox permissions for chat permissions on existing roles.
INSERT INTO "access"."permissions" ("id", "key", "description", "category", "created_at")
VALUES
  (gen_random_uuid(), 'chat.view', 'View chat rooms and messages', 'chat', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'chat.send', 'Send chat messages', 'chat', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'chat.create_room', 'Create group and client chat rooms', 'chat', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'chat.manage', 'Manage chat rooms and moderate messages', 'chat', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "access"."role_permissions" ("id", "role_id", "permission_id", "effect")
SELECT gen_random_uuid(), rp."role_id", chat_perm."id", 'ALLOW'
FROM "access"."role_permissions" rp
JOIN "access"."permissions" inbox_perm ON inbox_perm."id" = rp."permission_id"
JOIN "access"."permissions" chat_perm ON chat_perm."key" = CASE inbox_perm."key"
  WHEN 'inbox.view' THEN 'chat.view'
  WHEN 'inbox.reply' THEN 'chat.send'
  ELSE NULL
END
WHERE inbox_perm."key" IN ('inbox.view', 'inbox.reply')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Roles that had inbox.reply also get create_room for staff parity.
INSERT INTO "access"."role_permissions" ("id", "role_id", "permission_id", "effect")
SELECT gen_random_uuid(), rp."role_id", create_perm."id", 'ALLOW'
FROM "access"."role_permissions" rp
JOIN "access"."permissions" inbox_perm ON inbox_perm."id" = rp."permission_id" AND inbox_perm."key" = 'inbox.reply'
JOIN "access"."permissions" create_perm ON create_perm."key" = 'chat.create_room'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

DELETE FROM "access"."role_permissions"
WHERE "permission_id" IN (
  SELECT "id" FROM "access"."permissions" WHERE "key" IN ('inbox.view', 'inbox.reply')
);

DELETE FROM "access"."permissions" WHERE "key" IN ('inbox.view', 'inbox.reply');
