import React, { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useNavigation } from './contexts/NavigationContext';
import { CartProvider } from './contexts/CartContext';
import { useTheme } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { db } from './firebase';
// FIX: Import `ColorSet` to be used for explicit type casting for theme colors.
import { DiwaliThemeSettings, ThemeColors, ColorSet } from './types';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';
import DiwaliOverlays from './components/DiwaliOverlays';
import FloatingDecorations from './components/FloatingDecorations';
import HeaderOverlap from './components/HeaderOverlap';
import BottomBlend from './components/BottomBlend';

const PageRenderer = () => {
    const { page } = useNavigation();
    switch (page) {
        case 'home':
            return <Home />;
        case 'shop':
            return <Shop />;
        case 'cart':
            return <Cart />;
        case 'product':
            return <ProductDetail />;
        case 'search':
            return <Search />;
        case 'login':
            return <Login />;
        case 'signup':
            return <Signup />;
        case 'profile':
            return <Profile />;
        case 'admin':
            return <AdminDashboard />;
        default:
            return <Home />;
    }
}


const App: React.FC = () => {
  const { theme } = useTheme();

  useEffect(() => {
    const diwaliSettingsRef = db.ref('site_settings/diwaliThemeSettings');
    const listener = diwaliSettingsRef.on('value', (snapshot) => {
        const settings: DiwaliThemeSettings | null = snapshot.val();
        const root = document.documentElement;

        const overlays = {
            'header': settings?.headerOverlay,
            'corner': settings?.cornerRangoli,
            'fireworks': settings?.fireworks,
            'diya-row': settings?.diyaRow,
            'footer-decorative': settings?.footerDecorativeOverlay,
            'header-garland': settings?.headerGarland,
        };

        const updateCSSVar = (varName: string, value: string | undefined | null) => {
            if (value) {
                root.style.setProperty(varName, value);
            } else {
                root.style.removeProperty(varName);
            }
        };

        Object.entries(overlays).forEach(([key, overlaySettings]) => {
            const varPrefix = `--diwali-${key}`;
            const isDark = theme.includes('dark');
            const url = isDark && overlaySettings?.darkUrl ? overlaySettings.darkUrl : overlaySettings?.url;

            const isEnabled = overlaySettings?.enabled !== false;
            const isVisibleOnTheme = !!overlaySettings?.displayOnThemes?.[theme];

            updateCSSVar(`${varPrefix}-display`, isEnabled && isVisibleOnTheme ? 'block' : 'none');
            updateCSSVar(`${varPrefix}-opacity`, String(overlaySettings?.opacity ?? 1));
            updateCSSVar(`${varPrefix}-img`, url ? `url('${url}')` : null);
        });
    });
    
    return () => {
        diwaliSettingsRef.off('value', listener);
        // Clean up styles
        const root = document.documentElement;
        const keys = ['header', 'corner', 'fireworks', 'diya-row', 'footer-decorative', 'header-garland'];
        keys.forEach(key => {
            root.style.removeProperty(`--diwali-${key}-display`);
            root.style.removeProperty(`--diwali-${key}-opacity`);
            root.style.removeProperty(`--diwali-${key}-img`);
        });
    };
  }, [theme]); // Rerun when theme changes to apply correct dark/light URLs
  
  useEffect(() => {
    const viewportSettingRef = db.ref('site_settings/mobileViewport');
    const listener = viewportSettingRef.on('value', (snapshot) => {
        const setting = snapshot.val();
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            if (setting === 'desktop') {
                viewportMeta.setAttribute('content', 'width=1024');
                document.body.classList.add('force-desktop-view');
            } else { // Default to responsive
                viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
                document.body.classList.remove('force-desktop-view');
            }
        }
    });

    return () => {
        viewportSettingRef.off('value', listener);
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
            viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
        document.body.classList.remove('force-desktop-view');
    };
  }, []);

  // FIX: Replaced `Object.entries` with `Object.keys` and added explicit type assertions
  // to fix TypeScript errors related to indexing and argument types when setting CSS variables.
  useEffect(() => {
    const themeColorsRef = db.ref('site_settings/themeColors');

    const listener = themeColorsRef.on('value', (snapshot) => {
      const allThemeColors: ThemeColors | null = snapshot.val();
      const root = document.documentElement;
      
      // Cleanup texture variables first
      root.classList.remove('has-button-texture', 'has-custom-overlay');
      root.style.removeProperty('--button-texture-url');
      root.style.removeProperty('--button-text-color');
      root.style.removeProperty('--surface-texture-url');
      root.style.removeProperty('--surface-texture-opacity');


      if (allThemeColors && allThemeColors[theme]) {
        const activeColors = allThemeColors[theme] as ColorSet;

        const colorMap: Record<keyof ColorSet, string> = {
          primary: '--color-primary',
          bg: '--color-bg',
          surface: '--color-surface',
          text: '--color-text',
          secondary: '--color-secondary',
          lightGray: '--color-light-gray',
          shadowRgb: '--shadow-color-rgb',
          buttonTextureUrl: '--button-texture-url',
          buttonTextColor: '--button-text-color',
          surfaceTextureUrl: '--surface-texture-url',
          surfaceTextureOpacity: '--surface-texture-opacity',
        };

        Object.keys(activeColors).forEach((key) => {
          const typedKey = key as keyof ColorSet;
          const value = activeColors[typedKey];
          if (value && colorMap[typedKey]) {
            if (typedKey === 'buttonTextureUrl' && value) {
                root.style.setProperty(colorMap[typedKey], `url('${value}')`);
                root.classList.add('has-button-texture');
            } else if (typedKey === 'surfaceTextureUrl' && value) {
                root.style.setProperty(colorMap[typedKey], `url('${value}')`);
                root.classList.add('has-custom-overlay');
            } else {
                root.style.setProperty(colorMap[typedKey], String(value));
            }
          }
        });
      }
    });

    return () => {
      themeColorsRef.off('value', listener);
       const root = document.documentElement;
       root.classList.remove('has-button-texture', 'has-custom-overlay');
       root.style.removeProperty('--button-texture-url');
       root.style.removeProperty('--button-text-color');
       root.style.removeProperty('--surface-texture-url');
       root.style.removeProperty('--surface-texture-opacity');
    };
  }, [theme]); // Rerun when the theme name changes


  return (
    <AuthProvider>
      <CartProvider>
        <SettingsProvider>
            <div className="bg-brand-surface text-brand-text">
                <DiwaliOverlays />
                <FloatingDecorations />
                <HeaderOverlap />
                <Header />
                <main>
                    <PageRenderer />
                </main>
                <BottomBlend />
                <Footer />
            </div>
        </SettingsProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
