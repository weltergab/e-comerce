import { Theme, ThemeMode } from '@/types/theme';

export const themes: Record<ThemeMode, Theme> = {
  light1: {
    mode: 'light1',
    name: 'Light Ocean',
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceHover: '#f1f5f9',

      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',

      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryText: '#ffffff',

      accent: '#8b5cf6',
      accentHover: '#7c3aed',
      accentText: '#ffffff',

      border: '#e2e8f0',
      borderLight: '#f1f5f9',

      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',

      shadow: 'rgba(15, 23, 42, 0.1)',
    },
  },

  light2: {
    mode: 'light2',
    name: 'Light Sunset',
    colors: {
      background: '#fef3f2',
      surface: '#ffffff',
      surfaceHover: '#fee2e2',

      text: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#a8a29e',

      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryText: '#ffffff',

      accent: '#ec4899',
      accentHover: '#db2777',
      accentText: '#ffffff',

      border: '#fed7aa',
      borderLight: '#ffedd5',

      success: '#22c55e',
      error: '#dc2626',
      warning: '#eab308',

      shadow: 'rgba(28, 25, 23, 0.1)',
    },
  },

  dark1: {
    mode: 'dark1',
    name: 'Dark Slate',
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceHover: '#334155',

      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',

      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',

      accent: '#a78bfa',
      accentHover: '#8b5cf6',
      accentText: '#ffffff',

      border: '#334155',
      borderLight: '#475569',

      success: '#22c55e',
      error: '#f87171',
      warning: '#fbbf24',

      shadow: 'rgba(0, 0, 0, 0.5)',
    },
  },

  dark2: {
    mode: 'dark2',
    name: 'Dark Purple',
    colors: {
      background: '#18181b',
      surface: '#27272a',
      surfaceHover: '#3f3f46',

      text: '#fafafa',
      textSecondary: '#d4d4d8',
      textMuted: '#71717a',

      primary: '#a855f7',
      primaryHover: '#9333ea',
      primaryText: '#ffffff',

      accent: '#06b6d4',
      accentHover: '#0891b2',
      accentText: '#ffffff',

      border: '#3f3f46',
      borderLight: '#52525b',

      success: '#4ade80',
      error: '#fb7185',
      warning: '#facc15',

      shadow: 'rgba(0, 0, 0, 0.6)',
    },
  },
};

export const getTheme = (mode: ThemeMode): Theme => themes[mode];
