import { ChangeEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api/client';

const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_LABEL = '4MB';
const MIN_IMAGE_COMPRESS_BYTES = 200 * 1024;

interface ProductImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  onPendingChange?: (hasPendingImages: boolean) => void;
  disabled?: boolean;
}

export interface ProductImageManagerHandle {
  uploadPendingImages: () => Promise<string[]>;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  compressed: boolean;
}

const createId = () =>
  window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatBytes = (bytes: number) => `${Math.ceil(bytes / 1024)}KB`;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível carregar a imagem'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível reduzir a imagem'));
      },
      'image/jpeg',
      quality
    );
  });

async function compressImage(file: File) {
  const image = await loadImage(file);
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  let quality = 0.82;
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, quality);
    if (blob.size < file.size && (!bestBlob || blob.size < bestBlob.size)) {
      bestBlob = blob;
    }

    if (blob.size <= MAX_IMAGE_UPLOAD_BYTES && blob.size < file.size) {
      const compressedName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
      return new File([blob], `${compressedName}-reduzida.jpg`, { type: 'image/jpeg' });
    }

    if (quality > 0.46) {
      quality -= 0.08;
    } else {
      width *= 0.82;
      height *= 0.82;
      quality = 0.82;
    }
  }

  if (bestBlob) {
    const compressedName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
    return new File([bestBlob], `${compressedName}-reduzida.jpg`, { type: 'image/jpeg' });
  }

  throw new Error('Esta imagem já está menor na qualidade original.');
}

export const ProductImageManager = forwardRef<ProductImageManagerHandle, ProductImageManagerProps>(function ProductImageManager(
  {
    images,
    onChange,
    onPendingChange,
    disabled = false,
  },
  ref
) {
  const [urlInput, setUrlInput] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
    onPendingChange?.(pendingImages.length > 0);
  }, [pendingImages, onPendingChange]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const addUrl = () => {
    const nextUrl = urlInput.trim();
    if (!nextUrl) return;
    if (images.includes(nextUrl)) {
      setUrlInput('');
      return;
    }

    onChange([...images, nextUrl]);
    setUrlInput('');
  };

  const removeImage = (imageUrl: string) => {
    onChange(images.filter((image) => image !== imageUrl));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    setPendingImages((current) => [
      ...current,
      ...files.map((file) => ({
        id: createId(),
        file,
        previewUrl: URL.createObjectURL(file),
        compressed: false,
      })),
    ]);
    event.target.value = '';
  };

  const removePendingImage = (id: string) => {
    setPendingImages((current) => {
      const pending = current.find((image) => image.id === id);
      if (pending) URL.revokeObjectURL(pending.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  };

  const reduceImageQuality = async (id: string) => {
    const pending = pendingImages.find((image) => image.id === id);
    if (!pending) return;

    setCompressingId(id);
    try {
      const compressedFile = await compressImage(pending.file);
      const nextPreviewUrl = URL.createObjectURL(compressedFile);
      setPendingImages((current) =>
        current.map((image) => {
          if (image.id !== id) return image;
          URL.revokeObjectURL(image.previewUrl);
          return {
            ...image,
            file: compressedFile,
            previewUrl: nextPreviewUrl,
            compressed: true,
          };
        })
      );
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao reduzir imagem');
    } finally {
      setCompressingId(null);
    }
  };

  const uploadPendingImages = async () => {
    const oversized = pendingImages.find((image) => image.file.size > MAX_IMAGE_UPLOAD_BYTES);
    if (oversized) {
      throw new Error(`A imagem "${oversized.file.name}" tem ${formatBytes(oversized.file.size)}. Reduza a qualidade antes de salvar.`);
    }

    if (pendingImages.length === 0) return images;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const pending of pendingImages) {
        const formData = new FormData();
        formData.append('file', pending.file, pending.file.name);
        const response = await apiFetch('/api/admin/uploads/product-images', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Erro ao enviar ${pending.file.name}`);
        }

        uploadedUrls.push(data.url);
      }

      const nextImages = [...images, ...uploadedUrls.filter((url) => !images.includes(url))];
      onChange(nextImages);
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPendingImages([]);
      return nextImages;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao enviar imagens');
    } finally {
      setUploading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    uploadPendingImages,
  }));

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Imagens do Produto
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-borderLight)',
              color: 'var(--color-text)',
            }}
            placeholder="https://exemplo.com/imagem.jpg"
            disabled={disabled}
          />
          <Button type="button" variant="outline" onClick={addUrl} disabled={disabled || !urlInput.trim()}>
            Adicionar URL
          </Button>
        </div>
      </div>

      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-borderLight)',
        }}
      >
        <label className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-full font-semibold cursor-pointer transition-all active:scale-[0.98]"
          style={{
            color: 'var(--color-buttonPrimaryBg)',
            border: '2px solid var(--color-buttonPrimaryBg)',
          }}
        >
          <Upload className="w-4 h-4" />
          Selecionar fotos do dispositivo
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFiles}
            disabled={disabled}
          />
        </label>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-textMuted)' }}>
          Máximo de {MAX_IMAGE_UPLOAD_LABEL} por imagem. Fotos menores são enviadas com qualidade original.
        </p>
      </div>

      {pendingImages.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingImages.map((pending) => {
              const isOversized = pending.file.size > MAX_IMAGE_UPLOAD_BYTES;
              
              return (
                <div
                  key={pending.id}
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    border: `1px solid ${isOversized ? 'var(--color-error)' : 'var(--color-borderLight)'}`,
                  }}
                >
                  <div className="flex gap-3">
                    <img src={pending.previewUrl} alt={pending.file.name} className="w-20 h-20 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {pending.file.name}
                      </p>
                      <p className="text-xs" style={{ color: isOversized ? 'var(--color-error)' : 'var(--color-textSecondary)' }}>
                        {formatBytes(pending.file.size)}
                        {pending.compressed ? ' após redução' : ''}
                      </p>
                      {isOversized && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                          Reduza para liberar o upload.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => reduceImageQuality(pending.id)}
                          disabled={disabled || pending.file.size < MIN_IMAGE_COMPRESS_BYTES || compressingId === pending.id}
                        >
                          {compressingId === pending.id ? 'Reduzindo...' : 'Reduzir qualidade'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removePendingImage(pending.id)}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {uploading && (
            <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              Enviando fotos selecionadas...
            </p>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((imageUrl) => (
            <div
              key={imageUrl}
              className="relative rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-borderLight)' }}
            >
              <img src={imageUrl} alt="Imagem do produto" className="w-full aspect-square object-cover rounded-lg" />
              <button
                type="button"
                aria-label="Remover imagem"
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-error)',
                  border: '1px solid var(--color-borderLight)',
                }}
                onClick={() => removeImage(imageUrl)}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
