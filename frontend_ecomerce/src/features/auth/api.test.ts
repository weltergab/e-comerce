import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSession, registerAccount } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('registerAccount', () => {
  it('envia o cadastro exclusivamente por POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accessToken: 'token',
      user: { id: 'user-1', email: 'user@example.com', username: 'user1', isAdmin: false },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await registerAccount('user@example.com', 'user1', 'password-123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/auth\/register$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'user@example.com',
      username: 'user1',
      password: 'password-123',
    });
  });
});

describe('refreshSession', () => {
  it('trata a ausência de sessão como estado anônimo, sem erro HTTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshSession()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });
});
