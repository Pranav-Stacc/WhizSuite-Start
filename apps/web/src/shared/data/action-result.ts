export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export function fail(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

export function succeed<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}
