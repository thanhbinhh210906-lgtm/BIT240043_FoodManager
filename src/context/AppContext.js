// MSSV: BIT240043
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getLanguage, saveLanguage, seedIfNeeded } from '../services/storage';
import i18n from '../i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await seedIfNeeded();
      const saved = await getLanguage();
      setLang(saved);
      i18n.changeLanguage(saved);
      setReady(true);
    })();
  }, []);

  const changeLanguage = useCallback(async (next) => {
    setLang(next);
    i18n.changeLanguage(next);
    await saveLanguage(next);
  }, []);

  return (
    <AppContext.Provider value={{ lang, changeLanguage, ready }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);