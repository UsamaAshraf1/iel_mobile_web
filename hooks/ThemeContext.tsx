import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
  isSystemTheme: boolean;
  // Optional: expose current resolved color scheme
  colorScheme: ColorSchemeName;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'userPreferredTheme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = Appearance.getColorScheme();

  const [preferredTheme, setPreferredTheme] = useState<Theme | null>(null);
  const [themeKey, setThemeKey] = useState(0);           // ← forces re-render like RootLayout
  const [isLoading, setIsLoading] = useState(true);

  // Resolved theme that components actually use
  const resolvedTheme: Theme =
    preferredTheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light');

  const isDark = resolvedTheme === 'dark';
  const isSystemTheme = preferredTheme === null;

  // Load saved preference once on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (!mounted) return;

        if (saved === 'light' || saved === 'dark') {
          setPreferredTheme(saved as Theme);
        }
        // else → stay null → follow system
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to system theme changes (only matters when following system)
  useEffect(() => {
    if (preferredTheme !== null) return; // user has manual preference → ignore system

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Small delay + force re-render → helps some components / libraries that cache
      setTimeout(() => {
        setThemeKey((k) => k + 1);
      }, 60);
    });

    return () => subscription.remove();
  }, [preferredTheme]);

  const toggleTheme = useCallback(async () => {
    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';

    // If switching away from system → save the new choice
    // If already manual → just update
    setPreferredTheme(nextTheme);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }

    // Small delay + force re-render (inspired by your RootLayout)
    setTimeout(() => {
      setThemeKey((prev) => prev + 1);
    }, 80);
  }, [resolvedTheme]);

  // Optional: allow resetting to system theme
  const resetToSystem = useCallback(async () => {
    setPreferredTheme(null);
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    } catch {}
    setTimeout(() => setThemeKey((k) => k + 1), 80);
  }, []);

  if (isLoading) {
    return null; // or <Loading /> — but usually RootLayout already handles loading
  }

  const value: ThemeContextType = {
    theme: resolvedTheme,
    toggleTheme,
    isDark,
    isSystemTheme,
    colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light',
    // resetToSystem,       ← you can expose this too if needed
  };

  return (
    <ThemeContext.Provider value={value} key={themeKey}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};