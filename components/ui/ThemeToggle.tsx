'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeMode } from '@/types/theme';
import { themes, isThemeDisabled } from '@/lib/theme/themes';

export const ThemeToggle = () => {
  const { themeMode, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    setIsOpen(false);
  };

  const currentTheme = themes[themeMode];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        aria-label="Change theme"
      >
        <ThemeIcon mode={themeMode} />
        <span className="text-sm font-medium hidden sm:inline">
          {currentTheme.name}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {(Object.keys(themes) as ThemeMode[]).map((mode) => {
              const disabled = isThemeDisabled(mode);

              return (
                <button
                  key={mode}
                  onClick={() => !disabled && handleThemeChange(mode)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    disabled ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  style={{
                    backgroundColor: disabled
                      ? 'var(--color-background)'
                      : mode === themeMode
                        ? 'var(--color-surfaceHover)'
                        : 'transparent',
                    color: disabled ? 'var(--color-textMuted)' : 'var(--color-text)',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && mode !== themeMode) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && mode !== themeMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <ThemeIcon mode={mode} />
                  <span className="text-sm font-medium">{themes[mode].name}</span>
                  {disabled && (
                    <span className="text-xs ml-auto" style={{ color: 'var(--color-textMuted)' }}></span>
                  )}
                  {!disabled && mode === themeMode && (
                    <svg
                      className="w-4 h-4 ml-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const ThemeIcon = ({ mode }: { mode: ThemeMode }) => {
  const icons = {
    light3: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    dark2: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return icons[mode];
};
