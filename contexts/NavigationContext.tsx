import React, { createContext, useState, useContext } from 'react';

type Page = 'home' | 'login' | 'signup' | 'profile' | 'admin' | 'shop' | 'cart' | 'product' | 'search';

interface NavigationContextType {
  page: Page;
  params: any;
  navigate: (page: Page, params?: any) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [page, setPage] = useState<Page>('home');
  const [params, setParams] = useState<any>(null);

  const navigate = (newPage: Page, newParams?: any) => {
    setPage(newPage);
    setParams(newParams || null);
    window.scrollTo(0, 0);
  };

  return (
    <NavigationContext.Provider value={{ page, navigate, params }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
