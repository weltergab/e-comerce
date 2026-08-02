export type ThemeMode = 'light3' | 'dark2';

export interface Theme {
  mode: ThemeMode;
  name: string;
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceHover: string;

    // Text colors
    headingH1: string;
    headingH2: string;
    headingH3: string;
    headingH4: string;
    paragraph: string;
    specialText: string;
    text: string;
    textSecondary: string;
    textMuted: string;

    // Button theme colors
    buttonPrimaryBg: string;
    buttonSecondaryBg: string;
    buttonPrimarySecondary: string;
    buttonSecondarySecondary: string;

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
