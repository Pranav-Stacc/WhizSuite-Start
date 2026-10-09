/** Minimal contact details other domains may need to reach a user (e.g. notification email). */
export interface UserContact {
  id: string;
  email: string;
  firstName: string | null;
}
