import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyCors, getEnvStatus } from './_handler';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    service: 'storecy-backend',
    checkedAt: new Date().toISOString(),
    ...getEnvStatus(),
  }));
}
