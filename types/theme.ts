export type ThemeMode = 'light1' | 'light2' | 'dark1' | 'dark2';

export interface Theme {
  mode: ThemeMode;
  name: string;
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceHover: string;

    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;

    // Primary colors
    primary: string;
    primaryHover: string;
    primaryText: string;

    // Accent colors
    accent: string;
    accentHover: string;
    accentText: string;

    // Border colors
    border: string;
    borderLight: string;

    // Status colors
    success: string;
    error: string;
    warning: string;

    // Shadow
    shadow: string;
  };
}
