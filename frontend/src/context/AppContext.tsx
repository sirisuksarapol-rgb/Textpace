import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Lang = 'th' | 'en';
type Theme = 'light' | 'dark';

interface AppContextType {
  lang: Lang;
  toggleLang: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = sessionStorage.getItem('lang');
    return saved === 'en' || saved === 'th' ? saved : 'th';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = sessionStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    sessionStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    sessionStorage.setItem('lang', lang);
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'th' ? 'en' : 'th'));
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <AppContext.Provider value={{ lang, toggleLang, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}