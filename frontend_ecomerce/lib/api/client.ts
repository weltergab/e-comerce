const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const isLocalFrontend = import.meta.env.DEV || (typeof window !== 'undefined' && localHosts.has(window.location.hostname));
const apiBaseUrl = (isLocalFrontend ? import.meta.env.VITE_BACKEND_LOCAL_URL : import.meta.env.VITE_BACKEND_URL)?.replace(/\/$/, '') || (isLocalFrontend ? 'http://localhost:3001' : '');

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export interface ApiErrorBody {
  code?: string;
  message?: string;
  requestId?: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message || 'Não foi possível concluir a solicitação.');
  }
}

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(apiUrl('/api/auth/refresh'), { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json() as { accessToken: string };
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);
  let response = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' });

  const canRefresh = !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register') && !path.startsWith('/api/auth/refresh');
  if (response.status === 401 && canRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`);
      response = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
    }
  }
  return response;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const body = await response.json().catch(() => ({})) as T & ApiErrorBody;
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}
