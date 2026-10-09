export const PROFILE_NAME_MAX_LENGTH = 100;
export const PROFILE_JOB_TITLE_MAX_LENGTH = 120;

export interface ProfileDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string | null;
  jobTitle?: string | null;
}

export interface NotificationPreferenceDto {
  typeKey: string;
  enabled: boolean;
}
