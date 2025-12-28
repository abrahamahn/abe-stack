import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  useSystemTheme: () => void;
  isUsingSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  useSystemTheme: () => {},
  isUsingSystemTheme: false,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

// Helper function to get system preference
const getSystemThemePreference = (): ThemeMode => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Track if we're using system theme
  const [isUsingSystemTheme, setIsUsingSystemTheme] = useState<boolean>(() => {
    return localStorage.getItem('useSystemTheme') === 'true';
  });

  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Check if we should use system theme
    if (localStorage.getItem('useSystemTheme') === 'true') {
      return getSystemThemePreference();
    }

    // Check if theme is stored in localStorage
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    // Default to system preference
    setIsUsingSystemTheme(true);
    return getSystemThemePreference();
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (isUsingSystemTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [isUsingSystemTheme]);

  // Apply theme to document when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // Only save to localStorage if not using system theme
    if (!isUsingSystemTheme) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isUsingSystemTheme]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setIsUsingSystemTheme(false);
    localStorage.setItem('useSystemTheme', 'false');
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Set theme directly
  const setTheme = (newTheme: ThemeMode) => {
    setIsUsingSystemTheme(false);
    localStorage.setItem('useSystemTheme', 'false');
    setThemeState(newTheme);
  };

  // Use system theme
  const useSystemTheme = () => {
    setIsUsingSystemTheme(true);
    localStorage.setItem('useSystemTheme', 'true');
    setThemeState(getSystemThemePreference());
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        useSystemTheme,
        isUsingSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
