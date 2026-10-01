import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSession, registerAccount } from './api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

  it('repete a renovação quando outra aba acabou de rotacionar o cookie', async () => {
    vi.useFakeTimers();
    const session = {
      accessToken: 'novo-token',
      user: { id: 'user-1', email: 'user@example.com', username: 'user1', isAdmin: false },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'REFRESH_ALREADY_ROTATED' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = refreshSession();
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual(session);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
