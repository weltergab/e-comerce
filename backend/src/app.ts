import express from 'express';
import { getEnv } from './config/env';
import { corsMiddleware } from './config/cors';
import { apiLimiter, securityHeaders } from './config/security';
import { errorHandler, notFound, requestContext } from './shared/http';
import { logger } from './shared/logger';
import { adminRoutes } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { checkoutRoutes } from './modules/checkout/checkout.routes';
import { adminContentRoutes, contentRoutes } from './modules/content/content.routes';
import { orderRoutes } from './modules/orders/orders.routes';
import { stripeWebhookRoutes } from './modules/webhooks/stripe-webhook.routes';
import { addressRoutes } from './modules/addresses/addresses.routes';
import { initMonitoring } from './config/monitoring';

initMonitoring();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('query parser', 'simple');
app.use(requestContext);
app.use((req, res, next) => {
  const url = new URL(req.url, 'http://localhost');
  const rewrittenPath = url.searchParams.get('__path');
  if (url.pathname === '/api/index' && rewrittenPath) {
    if (!/^[A-Za-z0-9/_-]+$/.test(rewrittenPath)) {
      res.status(400).json({ code: 'INVALID_API_PATH', message: 'Caminho de API inválido.', requestId: req.requestId });
      return;
    }
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = `/api/${rewrittenPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  }
  next();
});
app.use(corsMiddleware, securityHeaders, apiLimiter);
app.use((req, res, next) => {
  req.setTimeout(15_000);
  res.setTimeout(15_000, () => {
    if (!res.headersSent) res.status(503).json({ code: 'REQUEST_TIMEOUT', message: 'A solicitação excedeu o tempo limite.', requestId: req.requestId });
  });
  next();
});

// O body deve permanecer bruto exclusivamente nesta rota para validar a assinatura.
app.use('/api/webhooks/stripe', stripeWebhookRoutes);
app.use(express.json({ limit: '256kb', strict: true }));

app.get('/api/health', (_req, res) => res.json({ service: 'storecy-backend', ok: true, checkedAt: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/products', catalogRoutes);
app.use('/api/account/addresses', addressRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/parameters', contentRoutes);
app.use('/api/admin/parameters', adminContentRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFound, errorHandler);

export function startServer() {
  const env = getEnv();
  app.listen(env.port, () => logger.info('api_started', { port: env.port, environment: env.nodeEnv }));
}

export default app;
