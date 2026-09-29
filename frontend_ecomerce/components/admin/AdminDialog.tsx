import type { ReactNode } from 'react';

export function AdminDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg w-[calc(100vw-1rem)] sm:w-full max-w-4xl p-4 sm:p-6 max-h-[94vh] sm:max-h-[88vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-background)', border: '2px solid var(--color-borderLight)' }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminDialogHeader({ icon, title, description, onClose }: { icon: ReactNode; title: string; description: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-start gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:block p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-borderLight)' }}>
          {icon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
          <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{description}</p>
        </div>
      </div>
      <button type="button" aria-label="Fechar" onClick={onClose} className="text-3xl leading-none transition-colors p-2 rounded-full flex-shrink-0 hover:text-[var(--color-error)] hover:bg-[var(--color-surfaceHover)]" style={{ color: 'var(--color-textSecondary)' }}>
        ×
      </button>
    </div>
  );
}
