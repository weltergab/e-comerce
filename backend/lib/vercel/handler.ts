import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyCorsHeaders, getEnvStatus } from '../config/cors';

function restoreRewrittenApiPath(req: IncomingMessage) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const rewrittenPath = requestUrl.searchParams.get('__path');

  if (!rewrittenPath || requestUrl.pathname !== '/api/index') return;

  requestUrl.searchParams.delete('__path');
  const normalizedPath = rewrittenPath.replace(/^\/+/, '');
  const queryString = requestUrl.searchParams.toString();

  req.url = `/api/${normalizedPath}${queryString ? `?${queryString}` : ''}`;
}

export function applyCors(req: IncomingMessage, res: ServerResponse) {
  applyCorsHeaders(req.headers.origin, (name, value) => res.setHeader(name, value));
}

export async function handleApi(req: IncomingMessage, res: ServerResponse) {
  applyCors(req, res);
  restoreRewrittenApiPath(req);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const { default: app } = await import('../../server/index');
    return app(req, res);
  } catch (error: any) {
    console.error('Failed to load API app:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'API failed to start',
      message: error?.message || 'Unknown error',
      ...getEnvStatus(),
    }));
  }
}