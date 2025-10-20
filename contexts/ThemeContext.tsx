import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../firebase';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light'); // Default to light theme

  useEffect(() => {
    // Listen for theme changes from Firebase
    const themeRef = db.ref('site_settings/activeTheme');
    const listener = themeRef.on('value', (snapshot) => {
      const activeTheme = snapshot.val();
      if (activeTheme && ['light', 'dark', 'blue', 'diwali', 'diwali-dark'].includes(activeTheme)) {
        setThemeState(activeTheme);
      } else {
        setThemeState('light'); // Fallback to light theme if value is invalid or null
      }
    });

    return () => themeRef.off('value', listener);
  }, []);

  useEffect(() => {
    // Apply theme class to the root element
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-diwali', 'theme-diwali-dark');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};