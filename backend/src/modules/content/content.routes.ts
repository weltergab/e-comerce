import { Router } from 'express';
import { db } from '../../db/client';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';

const key = 'introduction_header';
const fallback = {
  miniText: 'Abacate Shop',
  title: 'Produtos escolhidos para simplificar sua rotina',
  subtitle: 'Tecnologia, praticidade e compra segura em um só lugar.',
  description: 'Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiência direta para comprar sem complicação.',
};

function sanitize(input: unknown) {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const text = (name: keyof typeof fallback, max: number) => typeof value[name] === 'string' && value[name].trim() ? value[name].trim().slice(0, max) : fallback[name];
  return { miniText: text('miniText', 80), title: text('title', 120), subtitle: text('subtitle', 160), description: text('description', 360) };
}

async function read() {
  const { data, error } = await db().from('parameters').select('key,value,updated_at').eq('key', key).maybeSingle();
  if (error) throw new AppError(500, 'CONTENT_READ_FAILED', 'Não foi possível carregar o conteúdo.');
  return { key, value: sanitize(data?.value || fallback), updatedAt: data?.updated_at || null };
}

export const contentRoutes = Router();
contentRoutes.get('/introduction-header', asyncHandler(async (_req, res) => res.json({ parameter: await read() })));

export const adminContentRoutes = Router();
adminContentRoutes.use(requireAuth, requireAdmin);
adminContentRoutes.get('/introduction-header', asyncHandler(async (_req, res) => res.json({ parameter: await read() })));
adminContentRoutes.put('/introduction-header', asyncHandler(async (req, res) => {
  const value = sanitize(req.body?.value ?? req.body);
  const { error } = await db().from('parameters').upsert({ key, value, description: 'Homepage introduction header phrases' });
  if (error) throw new AppError(500, 'CONTENT_UPDATE_FAILED', 'Não foi possível atualizar o conteúdo.');
  res.json({ success: true, parameter: await read() });
}));
