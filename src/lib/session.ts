/**
 * Shared between the proxy (Edge runtime) and the auth helpers (Node runtime).
 * It lives in its own file because the proxy cannot import `@/lib/auth` — that
 * module pulls in `next/headers`, which is not available in middleware.
 */
export const SESSION_COOKIE_NAME = "deskflow_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
