'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Locale = 'en' | 'th';
type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (en: string, th: string) => string };
const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {}, t: en => en });
const storageKey = 'me-studio.language.v1';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setValue] = useState<Locale>('en');
  useEffect(() => { let active = true; queueMicrotask(() => { try { const saved = localStorage.getItem(storageKey); if (active && (saved === 'th' || saved === 'en')) setValue(saved); } catch { /* Use English when storage is unavailable. */ } }); return () => { active = false; }; }, []);
  const t = useCallback((en: string, th: string) => locale === 'th' ? th : en, [locale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function setLocale(value: Locale) { setValue(value); try { localStorage.setItem(storageKey, value); } catch { /* Keep the current session usable. */ } }
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
