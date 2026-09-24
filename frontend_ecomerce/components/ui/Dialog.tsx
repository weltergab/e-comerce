import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('keydown', closeOnEscape); previous?.focus(); };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" style={{ backgroundColor: 'rgba(0,0,0,.62)' }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl p-5 sm:p-6 outline-none" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-borderLight)' }}>
      <div className="flex justify-between items-start gap-4 mb-5"><h2 id="dialog-title" className="text-2xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar" className="text-2xl p-2">×</button></div>
      {children}
    </div>
  </div>;
}
