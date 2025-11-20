import { Theme, ThemeMode } from '@/types/theme';

// Temas desabilitados
const DISABLED_THEMES: ThemeMode[] = ['dark2'];

export const isThemeDisabled = (mode: ThemeMode): boolean => {
  return DISABLED_THEMES.includes(mode);
};

export const themes: Record<ThemeMode, Theme> = {
  light3: {
    mode: 'light3',
    name: 'Light Minimal',
    colors: {
      background: '#eceef0',
      surface: 'transparent',
      surfaceHover: '#e1e3e5',

      text: '#171717',
      textSecondary: '#525252',
      textMuted: '#a3a3a3',

      primary: '#171717',
      primaryHover: '#404040',
      primaryText: '#ffffff',

      accent: '#525252',
      accentHover: '#404040',
      accentText: '#ffffff',

      border: 'transparent',
      borderLight: '#d5d7d9',

      success: '#22c55e',
      error: '#dc2626',
      warning: '#eab308',

      shadow: 'rgba(0, 0, 0, 0.05)',
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
