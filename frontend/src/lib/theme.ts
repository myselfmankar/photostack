import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const current = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

/** Light/dark toggle. The choice is saved; index.html applies it before first paint. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);

  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode etc.: the toggle still works for this visit.
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
