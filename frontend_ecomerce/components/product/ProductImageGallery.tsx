'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageGalleryProps {
  images?: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
}

const getVisibleImages = (images?: string[]) =>
  (images || []).map((image) => image.trim()).filter(Boolean);

export function ProductImageGallery({
  images,
  alt,
  className = 'w-full h-80',
  imageClassName = 'w-full h-full object-cover rounded-lg',
}: ProductImageGalleryProps) {
  const visibleImages = getVisibleImages(images);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const swipedRef = useRef(false);
  const hasMultipleImages = visibleImages.length > 1;
  const currentImage = visibleImages[currentIndex] || '';

  useEffect(() => {
    if (currentIndex >= visibleImages.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleImages.length]);

  const goToImage = (direction: 1 | -1) => {
    setCurrentIndex((index) => {
      const nextIndex = index + direction;
      if (nextIndex < 0) return visibleImages.length - 1;
      if (nextIndex >= visibleImages.length) return 0;
      return nextIndex;
    });
  };

  const handleSwipeEnd = (x: number) => {
    if (touchStartX === null || !hasMultipleImages) return false;
    const distance = touchStartX - x;
    if (Math.abs(distance) > 40) {
      swipedRef.current = true;
      goToImage(distance > 0 ? 1 : -1);
      window.setTimeout(() => {
        swipedRef.current = false;
      }, 350);
      setTouchStartX(null);
      return true;
    }
    setTouchStartX(null);
    return false;
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--color-borderLight)' }}
      onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => {
        if (handleSwipeEnd(event.changedTouches[0]?.clientX ?? 0)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClickCapture={(event) => {
        if (swipedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          swipedRef.current = false;
        }
      }}
    >
      {currentImage ? (
        <img src={currentImage} alt={alt} className={imageClassName} draggable={false} />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ color: 'var(--color-textMuted)' }}
        >
          <span>Sem imagem</span>
        </div>
      )}

      {hasMultipleImages && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-borderLight)',
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goToImage(-1);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-borderLight)',
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goToImage(1);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {visibleImages.map((image, index) => (
              <span
                key={`${image}-${index}`}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    index === currentIndex ? 'var(--color-primary)' : 'var(--color-surface)',
                  border: '1px solid var(--color-borderLight)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
