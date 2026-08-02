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

      // Troque estes valores para alterar rapidamente textos deste tema.
      headingH1: '#111827',
      headingH2: '#171717',
      headingH3: '#262626',
      headingH4: '#404040',
      paragraph: '#525252',
      specialText: '#171717',

      text: '#171717',
      textSecondary: '#525252',
      textMuted: '#a3a3a3',

      // Cores de botoes deste tema.
      buttonPrimaryBg: '#171717',
      buttonSecondaryBg: '#eceef0',
      buttonPrimarySecondary: '#404040',
      buttonSecondarySecondary: '#e1e3e5',

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

      // Troque estes valores para alterar rapidamente textos deste tema.
      headingH1: '#ffffff',
      headingH2: '#fafafa',
      headingH3: '#e4e4e7',
      headingH4: '#d4d4d8',
      paragraph: '#d4d4d8',
      specialText: '#c084fc',

      text: '#fafafa',
      textSecondary: '#d4d4d8',
      textMuted: '#71717a',

      // Cores de botoes deste tema.
      buttonPrimaryBg: '#a855f7',
      buttonSecondaryBg: '#27272a',
      buttonPrimarySecondary: '#9333ea',
      buttonSecondarySecondary: '#3f3f46',

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
