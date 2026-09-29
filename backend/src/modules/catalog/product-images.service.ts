import { enqueueDeferredTask } from '../../background/queue';
import { DAY_SECONDS } from '../../background/tasks';
import { db } from '../../db/client';

const bucket = 'product-images';
const orphanRetentionMs = DAY_SECONDS * 1000;

function cleanupAt(createdAt = new Date().toISOString()) {
  return new Date(Date.parse(createdAt) + orphanRetentionMs).toISOString();
}

export async function recordProductImage(input: { path: string; publicUrl: string; uploadedBy: string }) {
  const createdAt = new Date().toISOString();
  const { error } = await db().from('product_images').insert({
    storage_path: input.path,
    public_url: input.publicUrl,
    uploaded_by: input.uploadedBy,
    status: 'pending',
    created_at: createdAt,
  });
  if (error) {
    await db().storage.from(bucket).remove([input.path]);
    throw error;
  }

  try {
    await enqueueDeferredTask({ type: 'product-image-cleanup', storagePath: input.path }, cleanupAt(createdAt));
  } catch (cause) {
    await db().storage.from(bucket).remove([input.path]);
    await db().from('product_images').delete().eq('storage_path', input.path);
    throw cause;
  }
}

export async function attachProductImages(productId: string, urls: string[], actorId: string) {
  const { data, error } = await db().from('product_images')
    .select('storage_path,public_url,product_id,uploaded_by')
    .or(`product_id.eq.${productId},uploaded_by.eq.${actorId}`);
  if (error) throw error;

  const detachedAt = new Date().toISOString();
  const imagesToDetach = (data || []).filter((image) => image.product_id === productId && !urls.includes(image.public_url));
  await Promise.all(imagesToDetach.map((image) =>
    enqueueDeferredTask({ type: 'product-image-cleanup', storagePath: image.storage_path }, cleanupAt(detachedAt))
  ));

  for (const image of data || []) {
    if (urls.includes(image.public_url) && (image.uploaded_by === actorId || image.product_id === productId)) {
      await db().from('product_images').update({ product_id: productId, status: 'attached' }).eq('public_url', image.public_url);
    } else if (image.product_id === productId && !urls.includes(image.public_url)) {
      await db().from('product_images').update({ product_id: null, status: 'pending', created_at: detachedAt }).eq('public_url', image.public_url);
    }
  }
}

export async function cleanupOrphanProductImage(storagePath: string) {
  const { data: image, error } = await db().from('product_images').select('storage_path,status,created_at').eq('storage_path', storagePath).maybeSingle();
  if (error) throw error;
  if (!image || image.status !== 'pending') return { removed: false };

  const retryAt = cleanupAt(image.created_at);
  if (Date.parse(retryAt) > Date.now()) return { removed: false, retryAt };

  const { error: storageError } = await db().storage.from(bucket).remove([storagePath]);
  if (storageError) throw storageError;
  const { error: deleteError } = await db().from('product_images').delete().eq('storage_path', storagePath).eq('status', 'pending');
  if (deleteError) throw deleteError;
  return { removed: true };
}
