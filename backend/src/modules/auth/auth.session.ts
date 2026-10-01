export const SESSION_TTL_SECONDS = 60 * 60;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_RACE_WINDOW_MS = 5_000;

export function newSessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_TTL_SECONDS * 1000).toISOString();
}

export function boundedSessionExpiry(expiresAt: string, createdAt: string) {
  const storedExpiry = Date.parse(expiresAt);
  const maximumExpiry = Date.parse(createdAt) + SESSION_TTL_SECONDS * 1000;
  if (!Number.isFinite(storedExpiry) || !Number.isFinite(maximumExpiry)) return new Date(0).toISOString();
  return new Date(Math.min(storedExpiry, maximumExpiry)).toISOString();
}

export function sessionSecondsRemaining(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

export function accessTokenSecondsRemaining(expiresAt: string, now = Date.now()) {
  return Math.min(ACCESS_TOKEN_TTL_SECONDS, sessionSecondsRemaining(expiresAt, now));
}

export function isRecentRefreshRotation(revokedAt: string, now = Date.now()) {
  const rotationTime = Date.parse(revokedAt);
  return Number.isFinite(rotationTime)
    && now >= rotationTime
    && now - rotationTime <= REFRESH_RACE_WINDOW_MS;
}
