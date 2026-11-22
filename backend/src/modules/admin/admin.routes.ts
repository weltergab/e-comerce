import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import { archiveProduct, createProduct, getAdminProduct, listAdminProducts, updateProduct } from '../catalog/catalog.service';
import { parsePagination, parseProductInput, type ProductInput } from '../catalog/catalog.schemas';
import { recordProductImage } from '../catalog/product-images.service';
import { listAdminOrders, updateAdminNotes, updateFulfillment } from '../orders/orders.service';
import { operationalMetrics } from './operations.service';
import { parseSyncDirection, parseSyncInput } from './catalog-sync.schemas';
import { listSyncLogs, listSyncProducts, synchronizeProduct } from './catalog-sync.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
const bucket = 'product-images';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get('/health', asyncHandler(async (_req, res) => {
  const [{ error: dbError }, stripeBalance] = await Promise.all([
    db().from('users').select('id', { head: true, count: 'exact' }),
    stripe().balance.retrieve().catch(() => null),
  ]);
  const checkedAt = new Date().toISOString();
  res.json({
    ok: !dbError && Boolean(stripeBalance),
    checkedAt,
    services: {
      backend: { ok: true, label: 'Backend', message: 'API respondendo normalmente.', checkedAt, uptimeSeconds: Math.round(process.uptime()) },
      database: { ok: !dbError, label: 'Banco de dados', message: dbError ? 'Falha na conexão com o banco.' : 'Conexão com o banco ativa.', checkedAt },
      stripe: { ok: Boolean(stripeBalance), label: 'Stripe', message: stripeBalance ? 'Conexão com pagamentos ativa.' : 'Falha na conexão com pagamentos.', checkedAt, mode: stripeBalance?.livemode ? 'live' : 'test' },
    },
  });
}));
adminRoutes.get('/metrics', asyncHandler(async (_req, res) => res.json({ metrics: await operationalMetrics() })));

adminRoutes.get('/sync/products', asyncHandler(async (req, res) => res.json(await listSyncProducts(parseSyncDirection(req.query.direction)))));
adminRoutes.post('/sync/products', asyncHandler(async (req, res) => res.json(await synchronizeProduct(parseSyncInput(req.body), req.auth!.userId))));
adminRoutes.get('/sync/logs', asyncHandler(async (_req, res) => res.json({ logs: await listSyncLogs() })));

adminRoutes.get('/products', asyncHandler(async (req, res) => res.json({ success: true, ...(await listAdminProducts(parsePagination(req.query))) })));
adminRoutes.get('/products/:id', asyncHandler(async (req, res) => res.json({ success: true, product: await getAdminProduct(String(req.params.id)) })));
adminRoutes.post('/products', asyncHandler(async (req, res) => {
  const input = parseProductInput(req.body) as ProductInput;
  res.status(201).json({ success: true, product: await createProduct(input, req.auth!.userId) });
}));
adminRoutes.put('/products/:id', asyncHandler(async (req, res) => {
  res.json({ success: true, product: await updateProduct(String(req.params.id), req.body, req.auth!.userId) });
}));
adminRoutes.delete('/products/:id', asyncHandler(async (req, res) => {
  await archiveProduct(String(req.params.id));
  res.json({ success: true, message: 'Produto arquivado.' });
}));

adminRoutes.post('/uploads/product-images', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'MISSING_IMAGE', 'Selecione uma imagem.');
  let image: Buffer;
  try {
    const metadata = await sharp(req.file.buffer).metadata();
    if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) throw new Error('invalid');
    image = await sharp(req.file.buffer, { animated: false }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (image.byteLength > 2 * 1024 * 1024) {
      image = await sharp(req.file.buffer, { animated: false }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 68 }).toBuffer();
    }
  } catch {
    throw new AppError(400, 'INVALID_IMAGE', 'O arquivo não é uma imagem JPEG, PNG, WebP ou GIF válida.');
  }
  const path = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`;
  const { error } = await db().storage.from(bucket).upload(path, image, { contentType: 'image/webp', upsert: false });
  if (error) throw new AppError(500, 'IMAGE_UPLOAD_FAILED', 'Não foi possível enviar a imagem.');
  const { data } = db().storage.from(bucket).getPublicUrl(path);
  await recordProductImage({ path, publicUrl: data.publicUrl, uploadedBy: req.auth!.userId });
  res.status(201).json({ success: true, path, url: data.publicUrl });
}));

adminRoutes.get('/orders', asyncHandler(async (req, res) => {
  const result = await listAdminOrders({
    limit: Math.min(Math.max(Number(req.query.limit) || 50, 1), 100),
    cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
  });
  res.json({ orders: result.orders, total: result.orders.length, nextCursor: result.nextCursor });
}));
adminRoutes.patch('/orders/:id', asyncHandler(async (req, res) => res.json({ success: true, order: await updateAdminNotes(String(req.params.id), req.auth!.userId, req.body?.adminNotes) })));
adminRoutes.patch('/orders/:id/fulfillment', asyncHandler(async (req, res) => {
  await updateFulfillment(String(req.params.id), req.body?.status, req.body?.trackingCode);
  res.json({ success: true });
}));
adminRoutes.post('/inventory/:productId/return', asyncHandler(async (req, res) => {
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  const quantity = req.body?.quantity;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !Number.isInteger(quantity) || quantity < 1 || !reason) {
    throw new AppError(400, 'INVALID_MANUAL_RETURN', 'Informe pedido, quantidade inteira e motivo da devolução.');
  }
  const { error } = await db().rpc('manual_return_inventory', {
    p_order_id: orderId,
    p_product_id: String(req.params.productId),
    p_quantity: quantity,
    p_actor_id: req.auth!.userId,
    p_reason: reason,
  });
  if (error) throw new AppError(409, 'MANUAL_RETURN_REJECTED', 'A devolução é inválida ou já foi registrada.');
  res.status(201).json({ success: true });
}));
