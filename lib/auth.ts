/**
 * Accounts — a mock, and labelled as one everywhere it appears.
 *
 * THIS IS NOT AUTHENTICATION. There is no user store, no password hashing, no
 * session token and no server-side check. The password field is read and
 * immediately discarded; only the username is kept, in a plain cookie, so the
 * demo can show that a paid tier has somewhere to live.
 *
 * It exists to make one product argument legible: the free tier works fine as
 * a guest, but a subscription and a pre-outage alert both need an account to
 * belong to. Nothing is protected by it.
 *
 * If this ever becomes real, everything below gets thrown away rather than
 * extended.
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,24}$/;

export function normaliseUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return USERNAME_PATTERN.test(name) ? name : null;
}

/** First letter, for the header chip. */
export function initialOf(username: string): string {
  return username.slice(0, 1).toUpperCase();
}
