'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[type];

  return (
    <div className="fixed inset-x-3 top-3 sm:inset-x-auto sm:right-4 sm:top-4 z-50 animate-slide-in pointer-events-none">
      <div
        className={`${bgColor} text-white w-full sm:w-auto sm:min-w-[300px] max-w-full sm:max-w-md px-4 py-3 sm:px-6 sm:py-4 rounded-lg shadow-lg flex items-start gap-3 pointer-events-auto`}
      >
        <span className="text-sm sm:text-base font-bold leading-6 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm sm:text-base leading-5 break-words">{message}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl font-bold leading-none flex-shrink-0"
          aria-label="Fechar notificação"
        >
          ×
        </button>
      </div>
    </div>
  );
}
