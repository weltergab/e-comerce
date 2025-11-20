'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeMode, Theme } from '@/types/theme';
import { getTheme } from '@/lib/theme/themes';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isMinimalTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light3');
  const [theme, setTheme] = useState<Theme>(getTheme('light3'));

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && ['light3', 'dark2'].includes(savedTheme)) {
      setThemeModeState(savedTheme);
      setTheme(getTheme(savedTheme));
    }
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setTheme(getTheme(mode));
    localStorage.setItem('theme', mode);
  };

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);

  const isMinimalTheme = themeMode === 'light3';

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isMinimalTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
