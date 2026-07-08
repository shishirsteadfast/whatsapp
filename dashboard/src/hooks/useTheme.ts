import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'openwa_theme';

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Always writes a concrete 'light' | 'dark' to data-theme, even for the
// 'system' setting, so Tailwind's `dark:` variant (keyed off data-theme)
// stays in sync with the resolved appearance instead of only the CSS
// custom-property fallback reacting to the media query.
function applyResolvedTheme(theme: Theme) {
  const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    return saved || 'system';
  });

  useEffect(() => {
    applyResolvedTheme(theme);
    localStorage.setItem(THEME_KEY, theme);

    if (theme !== 'system') return;

    // Keep data-theme live if the OS-level preference changes while 'system' is active
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyResolvedTheme('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  // Get the resolved theme (what's actually displayed)
  const resolvedTheme = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;

  return { theme, setTheme, toggleTheme, resolvedTheme };
}
