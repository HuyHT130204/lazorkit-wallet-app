import en from './en.json';
import vi from './vi.json';

export type Language = 'en' | 'vi';
export type TranslationKey = string;

const translations = {
  en,
  vi,
};

let currentLanguage: Language = 'en';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('lazorkit-language', lang);
  }
};

export const getLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: unknown = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found in any language
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  // Simple mustache-style interpolation: {{param}}
  if (params) {
    return value.replace(/{{\s*(\w+)\s*}}/g, (_match, p1) => {
      const v = params[p1 as keyof typeof params];
      return v !== undefined && v !== null ? String(v) : '';
    });
  }
  return value;
};

// Note: Avoid auto-initializing from localStorage at module load time to prevent
// SSR/CSR hydration mismatches. Use setLanguage() explicitly when user changes language.
