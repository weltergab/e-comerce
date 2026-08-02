const useRemoteBackend = import.meta.env.USE_REMOTE_BACKEND === 'true';
const apiBaseUrl = useRemoteBackend
  ? import.meta.env.BACKEND_URL?.replace(/\/$/, '') || ''
  : '';

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}
