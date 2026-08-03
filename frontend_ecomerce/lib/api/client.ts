const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const isLocalFrontend =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && localHosts.has(window.location.hostname));

const apiBaseUrl = isLocalFrontend
  ? import.meta.env.BACKEND_LOCAL_URL?.replace(/\/$/, '') || 'http://localhost:3001'
  : import.meta.env.BACKEND_URL?.replace(/\/$/, '') || '';

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
