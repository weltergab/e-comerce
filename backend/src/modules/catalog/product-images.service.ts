import { db } from '../../db/client';
import { logger } from '../../shared/logger';

const bucket = 'product-images';

export async function recordProductImage(input: { path: string; publicUrl: string; uploadedBy: string }) {
  const { error } = await db().from('product_images').insert({ storage_path: input.path, public_url: input.publicUrl, uploaded_by: input.uploadedBy, status: 'pending' });
  if (error) {
    await db().storage.from(bucket).remove([input.path]);
    throw error;
  }
}

export async function attachProductImages(productId: string, urls: string[], actorId: string) {
  const { data } = await db().from('product_images').select('public_url,product_id,uploaded_by').or(`product_id.eq.${productId},uploaded_by.eq.${actorId}`);
  for (const image of data || []) {
    if (urls.includes(image.public_url) && (image.uploaded_by === actorId || image.product_id === productId)) {
      await db().from('product_images').update({ product_id: productId, status: 'attached' }).eq('public_url', image.public_url);
    } else if (image.product_id === productId && !urls.includes(image.public_url)) {
      await db().from('product_images').update({ product_id: null, status: 'pending', created_at: new Date().toISOString() }).eq('public_url', image.public_url);
    }
  }
}

export async function cleanupOrphanProductImages(limit = 50) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data } = await db().from('product_images').select('storage_path').eq('status', 'pending').lt('created_at', cutoff).limit(limit);
  const paths = (data || []).map((image) => image.storage_path);
  if (!paths.length) return { removed: 0 };
  const { error } = await db().storage.from(bucket).remove(paths);
  if (error) {
    logger.error('orphan_image_cleanup_failed', { error: error.message });
    return { removed: 0 };
  }
  await db().from('product_images').delete().in('storage_path', paths);
  return { removed: paths.length };
}
