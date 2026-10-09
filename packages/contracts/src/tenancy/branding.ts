import { z } from 'zod';
import { themeSchema, type ThemeSettings } from '../theme/theme.js';

/** OrganizationSetting key that stores the agency-wide ThemeSettings JSON. */
export const ORG_APPEARANCE_THEME_KEY = 'appearance.theme';

export const updateOrgThemeSchema = themeSchema;
export type UpdateOrgThemeInput = ThemeSettings;

export const orgThemeResponseSchema = z.object({
  theme: themeSchema,
});
export type OrgThemeResponse = z.infer<typeof orgThemeResponseSchema>;
