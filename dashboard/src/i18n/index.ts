import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import he from './locales/he.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import bn from './locales/bn.json';
import pt from './locales/pt.json';
import id from './locales/id.json';
import ur from './locales/ur.json';
import ru from './locales/ru.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import it from './locales/it.json';

export const supportedLanguages = ['en', 'he', 'zh', 'es', 'ar', 'bn', 'pt', 'id', 'ur', 'ru', 'de', 'ja', 'it'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const rtlLanguages: SupportedLanguage[] = ['he', 'ar', 'ur'];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      zh: { translation: zh },
      es: { translation: es },
      ar: { translation: ar },
      bn: { translation: bn },
      pt: { translation: pt },
      id: { translation: id },
      ur: { translation: ur },
      ru: { translation: ru },
      de: { translation: de },
      ja: { translation: ja },
      it: { translation: it },
    },
    fallbackLng: 'en',
    supportedLngs: supportedLanguages as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'openwa_language',
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

function applyDirection(lang: string) {
  const base = (lang || 'en').split('-')[0] as SupportedLanguage;
  const dir = rtlLanguages.includes(base) ? 'rtl' : 'ltr';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = base;
    document.documentElement.dir = dir;
  }
}

applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;
