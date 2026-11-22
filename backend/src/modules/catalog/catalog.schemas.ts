import { getEnv } from '../../config/env';
import { AppError } from '../../shared/errors';

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  stock?: number;
  active: boolean;
}

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const storageHost = new URL(getEnv().supabaseUrl).hostname;
    return url.hostname === storageHost || getEnv().imageHostAllowlist.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function parseProductImages(value: unknown, existingImages?: readonly string[]) {
  if (Array.isArray(value) && value.every((image) => typeof image === 'string')) {
    if (existingImages?.length === value.length && value.every((image, index) => image === existingImages[index])) {
      return undefined;
    }
    if (value.length <= 8 && value.every((image) => existingImages?.includes(image) || isAllowedImageUrl(image))) {
      return value;
    }
  }
  throw new AppError(400, 'INVALID_PRODUCT_IMAGES', 'Use até 8 imagens. Novas URLs devem usar HTTPS e uma origem autorizada.');
}

export function parseProductInput(body: unknown, existingImages?: readonly string[]): Partial<ProductInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'INVALID_BODY', 'Produto inválido.');
  }
  const value = body as Record<string, unknown>;
  const output: Partial<ProductInput> = {};
  const partial = existingImages !== undefined;

  if (!partial || 'name' in value) {
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 160) {
      throw new AppError(400, 'INVALID_PRODUCT_NAME', 'Nome do produto inválido.');
    }
    output.name = value.name.trim();
  }
  if (!partial || 'price' in value) {
    if (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price <= 0 || value.price > 1_000_000) {
      throw new AppError(400, 'INVALID_PRODUCT_PRICE', 'Preço do produto inválido.');
    }
    output.price = Math.round(value.price * 100) / 100;
  }
  if ('stock' in value || !partial) {
    const stock = value.stock ?? 0;
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
      throw new AppError(400, 'INVALID_PRODUCT_STOCK', 'Estoque deve ser um inteiro não negativo.');
    }
    output.stock = stock;
  }
  if ('description' in value || !partial) output.description = typeof value.description === 'string' ? value.description.trim().slice(0, 5000) : '';
  if ('category' in value || !partial) output.category = typeof value.category === 'string' && value.category.trim() ? value.category.trim().slice(0, 80) : 'Geral';
  if ('currency' in value || !partial) {
    const currency = typeof value.currency === 'string' ? value.currency.toLowerCase() : 'brl';
    if (currency !== 'brl') throw new AppError(400, 'UNSUPPORTED_CURRENCY', 'A moeda aceita é BRL.');
    output.currency = currency;
  }
  if ('active' in value) output.active = Boolean(value.active);
  else if (!partial) output.active = true;
  if ('images' in value || !partial) {
    const images = parseProductImages(value.images, existingImages);
    if (images !== undefined) output.images = images;
  }
  return output;
}

export function parsePagination(query: Record<string, unknown>) {
  const parsedLimit = Number(query.limit || 24);
  return {
    limit: Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 24,
    cursor: typeof query.cursor === 'string' && query.cursor ? query.cursor : undefined,
  };
}
