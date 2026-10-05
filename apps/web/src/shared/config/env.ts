import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  APP_DATA_MODE: z.enum(['demo', 'live']).default('demo'),
  API_BASE_URL: z.string().url().default('http://localhost:3001/api'),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SESSION_SECRET: z.string().min(16).default('dev-only-session-secret-change-me'),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  SESSION_REFRESH_SKEW_SECONDS: z.coerce.number().int().nonnegative().default(60),
  SESSION_REFRESH_SHARE_MS: z.coerce.number().int().nonnegative().default(10_000),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid web configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  if (process.env.NODE_ENV === 'production' && parsed.data.SESSION_SECRET.startsWith('dev-only')) {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return parsed.data;
}

export const env = loadEnv();
export const isLiveMode = env.APP_DATA_MODE === 'live';
