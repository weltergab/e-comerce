import { describe, expect, it } from 'vitest';
import { buildClearedRefreshCookie, buildRefreshCookie, cookieValue } from '../../src/modules/auth/auth.cookies';
import { ACCESS_TOKEN_TTL_SECONDS, accessTokenSecondsRemaining, boundedSessionExpiry, isRecentRefreshRotation, newSessionExpiry, SESSION_TTL_SECONDS, sessionSecondsRemaining } from '../../src/modules/auth/auth.session';

describe('sessão persistente', () => {
  const now = Date.parse('2026-09-30T12:00:00.000Z');

  it('mantém uma expiração absoluta de uma hora', () => {
    const expiresAt = newSessionExpiry(now);
    expect(expiresAt).toBe('2026-09-30T13:00:00.000Z');
    expect(sessionSecondsRemaining(expiresAt, now)).toBe(SESSION_TTL_SECONDS);
    expect(accessTokenSecondsRemaining(expiresAt, now)).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(accessTokenSecondsRemaining(expiresAt, now + 59 * 60_000)).toBe(60);
  });

  it('limita sessões antigas de 30 dias a uma hora desde a emissão', () => {
    const legacyExpiry = new Date(now + 30 * 24 * 60 * 60_000).toISOString();
    expect(boundedSessionExpiry(legacyExpiry, new Date(now).toISOString())).toBe('2026-09-30T13:00:00.000Z');
  });

  it('cria cookie de produção persistente, HttpOnly e apto a contexto entre sites', () => {
    const cookie = buildRefreshCookie('token seguro', newSessionExpiry(now), true, now);
    expect(cookie).toContain('storecy_refresh=token%20seguro');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Partitioned');
    expect(cookie).toContain('Path=/api/auth');
  });

  it('limpa o cookie com os mesmos atributos usados em produção', () => {
    expect(buildClearedRefreshCookie(true)).toContain('SameSite=None; Path=/api/auth; Max-Age=0; Secure; Partitioned');
  });

  it('lê cookie codificado sem aceitar nomes parciais', () => {
    expect(cookieValue('other_storecy_refresh=x; storecy_refresh=token%20seguro', 'storecy_refresh')).toBe('token seguro');
  });

  it('trata somente rotações recentes como concorrentes', () => {
    expect(isRecentRefreshRotation(new Date(now - 2_000).toISOString(), now)).toBe(true);
    expect(isRecentRefreshRotation(new Date(now - 6_000).toISOString(), now)).toBe(false);
  });
});
