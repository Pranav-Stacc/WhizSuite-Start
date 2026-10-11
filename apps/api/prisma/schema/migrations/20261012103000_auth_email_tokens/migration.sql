-- Auth email tokens (password reset, email verification)
CREATE TABLE "identity"."auth_email_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_email_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_email_tokens_user_id_type_idx" ON "identity"."auth_email_tokens"("user_id", "type");
CREATE INDEX "auth_email_tokens_token_hash_idx" ON "identity"."auth_email_tokens"("token_hash");

ALTER TABLE "identity"."auth_email_tokens" ADD CONSTRAINT "auth_email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
