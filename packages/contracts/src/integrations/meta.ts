import { z } from 'zod';

/** Seeded IntegrationProvider.key for Facebook Login / Instagram Graph. */
export const META_PROVIDER_KEY = 'meta' as const;

/** Scopes requested for App Review + Instagram publish / engagement. */
export const META_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  /** Needed to list business owned/client pages for System-user (BISU) tokens. */
  'business_management',
] as const;

/** Minimum scopes required to resolve a Page / Instagram professional account. */
export const META_REQUIRED_ASSET_SCOPES = [
  'pages_show_list',
  'instagram_basic',
] as const;

export const metaOAuthStartSchema = z.object({
  clientId: z.string().uuid(),
  platform: z.enum(['instagram', 'facebook']).default('instagram'),
});

export type MetaOAuthStartInput = z.infer<typeof metaOAuthStartSchema>;
