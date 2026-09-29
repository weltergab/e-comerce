import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerAccount } from './api';

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
