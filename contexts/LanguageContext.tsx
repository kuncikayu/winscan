'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/lib/i18n';
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang) {
      setLanguageState(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('id')) setLanguageState('id');
      else if (browserLang.startsWith('zh')) setLanguageState('zh');
      else if (browserLang.startsWith('ja')) setLanguageState('ja');
      else if (browserLang.startsWith('hi')) setLanguageState('hi');
      else if (browserLang.startsWith('ru')) setLanguageState('ru');
      else if (browserLang.startsWith('vi')) setLanguageState('vi');
    }
  }, []);
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
