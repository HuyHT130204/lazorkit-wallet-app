'use client';

import { useState, useEffect } from 'react';
import { Language, setLanguage as setLang, getLanguage } from '@/lib/i18n';

export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lazorkit-language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'vi')) {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLang(lang);
    setLanguageState(lang);
  };

  return {
    language,
    setLanguage,
  };
};


