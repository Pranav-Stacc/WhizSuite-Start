import { z } from 'zod';
import {
  ARTICLE_LIST_LIMIT_DEFAULT,
  CONTENT_HASHTAGS_MAX_DEFAULT,
  CONTENT_LIST_LIMIT_DEFAULT,
  CONTENT_MEDIA_MAX_DEFAULT,
  CONTENT_REORDER_MAX_DEFAULT,
  FEEDBACK_COMMENT_LIST_LIMIT_DEFAULT,
  FEEDBACK_COMMENT_MAX_LENGTH_DEFAULT,
  INVOICE_LINES_MAX_DEFAULT,
  INVOICE_LIST_LIMIT_DEFAULT,
  LEAD_LIST_LIMIT_DEFAULT,
  PROJECT_LIST_LIMIT_DEFAULT,
  TIME_ENTRY_LIST_LIMIT_DEFAULT,
} from '@agency-os/contracts';

export const appConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    API_PREFIX: z.string().default('api'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    COOKIE_DOMAIN: z.string().default('localhost'),
    CORS_ORIGINS: z
      .string()
      .default(
        [
          'http://localhost:3000',
          'https://whizsuite.com',
          'https://www.whizsuite.com',
          'https://*.whizsuite.com',
          'https://whizsuite.praanav.in',
          'https://www.whizsuite.praanav.in',
          'https://*.whizsuite.praanav.in',
        ].join(','),
      ),
    STORAGE_ENDPOINT: z.string().url(),
    STORAGE_ACCESS_KEY: z.string().default(''),
    STORAGE_SECRET_KEY: z.string().default(''),
    STORAGE_BUCKET: z.string(),
    STORAGE_REGION: z.string().default('us-east-1'),
    STORAGE_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    STORAGE_UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(104_857_600),
    STORAGE_ALLOWED_MIME_TYPES: z
      .string()
      .default('image/*,video/*,audio/*,application/pdf')
      .transform((v) =>
        v
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    STORAGE_UPLOAD_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(900),
    STORAGE_DOWNLOAD_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    STORAGE_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    STORAGE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
    MEDIA_LIST_LIMIT: z.coerce.number().int().positive().default(200),
    AUTOMATION_LIST_LIMIT: z.coerce.number().int().positive().default(200),
    AUTOMATION_RUN_LIST_LIMIT: z.coerce.number().int().positive().default(50),
    METRIC_SNAPSHOT_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    CONTENT_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(CONTENT_LIST_LIMIT_DEFAULT),
    CONTENT_MEDIA_MAX: z.coerce
      .number()
      .int()
      .positive()
      .default(CONTENT_MEDIA_MAX_DEFAULT),
    CONTENT_HASHTAGS_MAX: z.coerce
      .number()
      .int()
      .positive()
      .default(CONTENT_HASHTAGS_MAX_DEFAULT),
    CONTENT_REORDER_MAX: z.coerce
      .number()
      .int()
      .positive()
      .default(CONTENT_REORDER_MAX_DEFAULT),
    FEEDBACK_COMMENT_MAX_LENGTH: z.coerce
      .number()
      .int()
      .positive()
      .default(FEEDBACK_COMMENT_MAX_LENGTH_DEFAULT),
    FEEDBACK_COMMENT_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(FEEDBACK_COMMENT_LIST_LIMIT_DEFAULT),
    INVOICE_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(INVOICE_LIST_LIMIT_DEFAULT),
    INVOICE_LINES_MAX: z.coerce
      .number()
      .int()
      .positive()
      .default(INVOICE_LINES_MAX_DEFAULT),
    LEAD_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(LEAD_LIST_LIMIT_DEFAULT),
    CRM_DEFAULT_PIPELINE_NAME: z.string().min(1).default('Sales'),
    PROJECT_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(PROJECT_LIST_LIMIT_DEFAULT),
    ARTICLE_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(ARTICLE_LIST_LIMIT_DEFAULT),
    TIME_ENTRY_LIST_LIMIT: z.coerce
      .number()
      .int()
      .positive()
      .default(TIME_ENTRY_LIST_LIMIT_DEFAULT),
    CHAT_ROOM_LIST_LIMIT: z.coerce.number().int().positive().default(100),
    CHAT_MESSAGE_PAGE_LIMIT: z.coerce.number().int().positive().default(50),
    RESOURCE_LIST_LIMIT: z.coerce.number().int().positive().default(200),
    SEARCH_RESULT_LIMIT: z.coerce.number().int().positive().default(20),
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    EMAIL_PROVIDER: z.string().default('mailpit'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().default(1025),
    EMAIL_FROM: z.string().default('Agency OS <noreply@agency-os.local>'),
    WEB_APP_URL: z.string().url().default('http://localhost:3000'),
    INVITATION_TTL_HOURS: z.coerce.number().int().positive().default(72),
    /** How long a shareable portal access link stays redeemable. */
    PORTAL_ACCESS_LINK_TTL_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(720),
    /** Default temporary portal membership duration after redeem. */
    PORTAL_ACCESS_TEMP_MEMBERSHIP_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(168),
    /** Optional store URLs shown on the portal-access landing page (empty = hide). */
    MOBILE_APP_STORE_URL: z.string().default(''),
    MOBILE_PLAY_STORE_URL: z.string().default(''),
    /** Custom URL scheme for OAuth return to the Flutter app (e.g. whizsuite). */
    MOBILE_DEEP_LINK_SCHEME: z.string().default('whizsuite'),
    IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
    AUTHZ_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(50),
    OUTBOX_RELAY_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    NOTIFICATION_LIST_LIMIT: z.coerce.number().int().positive().default(50),
    /** Channels used when a user has no stored preference for a notification type. */
    NOTIFICATION_DEFAULT_CHANNELS: z
      .string()
      .default('inApp,email,push')
      .transform((v) =>
        v
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    NOTIFICATION_EMAIL_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    NOTIFICATION_DELIVERY_ATTEMPTS: z.coerce
      .number()
      .int()
      .positive()
      .default(5),
    NOTIFICATION_DELIVERY_BACKOFF_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000),
    NOTIFICATION_DELIVERY_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(5),
    NOTIFICATION_DELIVERY_KEEP_FAILED: z.coerce
      .number()
      .int()
      .positive()
      .default(1_000),
    NOTIFICATION_LINK_PATH: z.string().default('/notifications'),
    /** Poll interval for task / approval / invoice reminder scanners. */
    REMINDER_SCHEDULER_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    REMINDER_SCHEDULER_POLL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    REMINDER_SCHEDULER_BATCH: z.coerce.number().int().positive().default(50),
    /** Notify this many minutes before a calendar event starts. */
    CALENDAR_REMINDER_LEAD_MINUTES: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(5),
    /** How far ahead of due date a task is considered "due soon". */
    TASK_REMINDER_DUE_SOON_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    /** Pending approvals older than this (when dueAt is null) get a reminder. */
    APPROVAL_REMINDER_AFTER_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    PUSH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    FCM_PROJECT_ID: z.string().default(''),
    FCM_CLIENT_EMAIL: z.string().default(''),
    /** PEM private key of the Firebase service account; `\n` escapes are accepted. */
    FCM_PRIVATE_KEY: z.string().default(''),
    /** Must match the notification channel the mobile app registers on Android. */
    PUSH_ANDROID_CHANNEL_ID: z.string().min(1).default('whizsuite_default'),
    DEVICES_PER_USER_MAX: z.coerce.number().int().positive().default(10),
    /** When true, POST /v1/auth/google accepts Google ID tokens. */
    GOOGLE_AUTH_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    /**
     * Comma-separated OAuth client IDs allowed as ID-token audiences
     * (Web + Android/iOS clients from the Firebase / Google Cloud project).
     */
    GOOGLE_OAUTH_CLIENT_IDS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    /** Drive data-source OAuth (separate from login audiences). Empty = connect disabled. */
    GOOGLE_DRIVE_CLIENT_ID: z.string().default(''),
    GOOGLE_DRIVE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_DRIVE_REDIRECT_URI: z.string().default(''),
    /** Google Calendar OAuth. Empty = connect disabled. May reuse Drive client credentials. */
    GOOGLE_CALENDAR_CLIENT_ID: z.string().default(''),
    GOOGLE_CALENDAR_CLIENT_SECRET: z.string().default(''),
    GOOGLE_CALENDAR_REDIRECT_URI: z.string().default(''),
    /** Meta (Facebook Login for Business / Instagram Graph). Empty = connect disabled. */
    META_APP_ID: z.string().default(''),
    META_APP_SECRET: z.string().default(''),
    META_REDIRECT_URI: z.string().default(''),
    /** Facebook Login for Business configuration ID (required for Business-type apps). */
    META_LOGIN_CONFIG_ID: z.string().default(''),
    META_GRAPH_API_VERSION: z.string().default('v21.0'),

    AGENT_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    AGENT_SERVICE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(120_000),
    /** Longer budget for SSE agent streams (heavy multi-tool runs). */
    AGENT_SERVICE_STREAM_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(600_000),
    AGENT_RUN_QUEUE_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(5),
    CAPABILITIES_CACHE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(90),
    /** Parallel tool executions per MCP batch request from the agent runtime. */
    CAPABILITY_BATCH_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(8),
    CAPABILITY_BATCH_MAX_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
    AGENT_RUN_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(900),
    AGENT_PENDING_ACTION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    AGENT_SESSION_LIST_LIMIT: z.coerce.number().int().positive().default(50),
    AGENT_RUN_LIST_LIMIT: z.coerce.number().int().positive().default(50),
    AGENT_SCHEDULER_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    AGENT_SCHEDULER_POLL_MS: z.coerce.number().int().positive().default(60_000),
    AGENT_SCHEDULER_BATCH: z.coerce.number().int().positive().default(20),
    OPENAI_API_KEY: z.string().default(''),
    ANTHROPIC_API_KEY: z.string().default(''),
  })
  .superRefine((config, ctx) => {
    if (config.PUSH_ENABLED) {
      for (const key of [
        'FCM_PROJECT_ID',
        'FCM_CLIENT_EMAIL',
        'FCM_PRIVATE_KEY',
      ] as const) {
        if (!config[key])
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'required when PUSH_ENABLED=true',
          });
      }
    }
    if (
      config.GOOGLE_AUTH_ENABLED &&
      config.GOOGLE_OAUTH_CLIENT_IDS.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_OAUTH_CLIENT_IDS'],
        message: 'required when GOOGLE_AUTH_ENABLED=true',
      });
    }
  });

export type AppConfig = z.infer<typeof appConfigSchema>;

export function validateAppConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const parsed = appConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  return parsed.data;
}
