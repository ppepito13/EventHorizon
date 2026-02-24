
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppSettingsContextType {
  showTestDataButtons: boolean;
  setShowTestDataButtons: (show: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [showTestDataButtons, setShowTestDataButtons] = useState<boolean>(false);

  useEffect(() => {
    const storedValue = localStorage.getItem('showTestDataButtons');
    if (storedValue) {
      setShowTestDataButtons(JSON.parse(storedValue));
    }
  }, []);

  const handleSetShowTestDataButtons = (show: boolean) => {
    setShowTestDataButtons(show);
    localStorage.setItem('showTestDataButtons', JSON.stringify(show));
  };

  return (
    <AppSettingsContext.Provider value={{ showTestDataButtons, setShowTestDataButtons: handleSetShowTestDataButtons }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
