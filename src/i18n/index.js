import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: 'en', // <--- BẮT BUỘC PHẢI LÀ 'en' THEO ĐỀ BÀI
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3', // Thường dùng cho React Native
  });

export default i18n;
