import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';

// Using a generic SiteSettings type as it's a large, evolving object
interface SiteSettings {
    [key: string]: any; 
}

const SettingsContext = createContext<SiteSettings>({});

export const useSiteSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    const settingsRef = db.ref('site_settings');
    const listener = settingsRef.on('value', (snapshot) => {
      setSettings(snapshot.val() || {});
    });

    return () => settingsRef.off('value', listener);
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};
