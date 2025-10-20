import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, CartIcon, UserIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCart } from '../contexts/CartContext';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { NavLink as NavLinkType } from '../types';
import LazyImage from './LazyImage';


const Header: React.FC = () => {
    const { currentUser, userProfile, logout } = useAuth();
    const { navigate } = useNavigation();
    const { cartCount } = useCart();
    const { theme } = useTheme();
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [logoUrl, setLogoUrl] = useState('https://i.ibb.co/7j0b561/logo.png');
    const [siteTitle, setSiteTitle] = useState('AURASHKA');
    const [siteTitleImageUrl, setSiteTitleImageUrl] = useState('');
    const [useImageForTitle, setUseImageForTitle] = useState(false);
    const [navLinks, setNavLinks] = useState<NavLinkType[]>([]);

    useEffect(() => {
        const settingsRef = db.ref('site_settings');
        const listener = settingsRef.on('value', (snapshot) => {
            const settings = snapshot.val();
            if (settings) {
                if (settings.logoUrl) setLogoUrl(settings.logoUrl);
                if (settings.siteTitle) setSiteTitle(settings.siteTitle);
                if (settings.siteTitleImageUrl) setSiteTitleImageUrl(settings.siteTitleImageUrl);
                setUseImageForTitle(!!settings.useImageForTitle);
                if (settings.header?.navLinks) {
                    setNavLinks(Object.values(settings.header.navLinks));
                }
            }
        });
        return () => settingsRef.off('value', listener);
    }, []);

    const handleNavClick = (e: React.MouseEvent, link: NavLinkType) => {
        e.preventDefault();
        switch (link.linkType) {
            case 'internal':
                navigate(link.link as any);
                break;
            case 'external':
                window.open(link.link, '_blank', 'noopener,noreferrer');
                break;
            case 'product':
                navigate('product', { productId: link.link });
                break;
            case 'category':
                navigate('shop', { categoryId: link.link, categoryName: link.text });
                break;
            default:
                break;
        }
    }
    
    const handleLogout = async () => {
        try {
            await logout();
            navigate('home');
        } catch {
            console.error('Failed to log out');
        }
    };

    const handleProfileClick = () => {
        if (currentUser) {
            setIsProfileDropdownOpen(prev => !prev);
        } else {
            navigate('login');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const visibleLinks = navLinks.filter(link => {
        if (!link.displayThemes || Object.keys(link.displayThemes).length === 0) {
            return true; // Show if no theme restrictions
        }
        return link.displayThemes[theme]; // Show if theme is explicitly set to true
    });

  return (
    <header className="sticky top-0 left-0 right-0 z-20 bg-brand-surface/80 backdrop-blur-sm shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <div className="flex-shrink-0">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('home'); }} className="flex items-center space-x-2">
                <LazyImage
                    wrapperClassName="h-10 w-10 rounded-full"
                    className="h-full w-full object-cover rounded-full"
                    src={logoUrl}
                    alt={`${siteTitle} Logo`}
                />
                {useImageForTitle && siteTitleImageUrl ? (
                    <LazyImage 
                        wrapperClassName="h-10 w-auto"
                        src={siteTitleImageUrl} 
                        alt={siteTitle} 
                        className="h-10 w-auto" 
                    />
                ) : (
                    <span className="text-2xl font-serif tracking-widest uppercase text-brand-text">{siteTitle}</span>
                )}
            </a>
          </div>
          <nav className="hidden md:flex md:space-x-10">
            {visibleLinks.map((link) => (
              <a key={link.id} href={link.link} onClick={(e) => handleNavClick(e, link)} className="text-sm font-medium text-brand-secondary hover:text-brand-text flex items-center">
                {link.text}
              </a>
            ))}
          </nav>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('search')} className="text-brand-secondary hover:text-brand-text"><SearchIcon className="h-6 w-6" /></button>
                <button onClick={() => navigate('cart')} className="relative text-brand-secondary hover:text-brand-text">
                    <CartIcon className="h-6 w-6" />
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-brand-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {cartCount}
                        </span>
                    )}
                </button>
                <div className="relative" ref={dropdownRef}>
                    <button onClick={handleProfileClick} className="text-brand-secondary hover:text-brand-text">
                        <UserIcon className="h-6 w-6" />
                    </button>
                    {currentUser && isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-brand-surface rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                            {userProfile?.role === 'admin' && (
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate('admin');
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="block px-4 py-2 text-sm text-brand-secondary hover:bg-brand-light-gray/50"
                                >
                                    Admin Panel
                                </a>
                            )}
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('profile');
                                    setIsProfileDropdownOpen(false);
                                }}
                                className="block px-4 py-2 text-sm text-brand-secondary hover:bg-brand-light-gray/50"
                            >
                                My Profile
                            </a>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleLogout();
                                    setIsProfileDropdownOpen(false);
                                }}
                                className="block px-4 py-2 text-sm text-brand-secondary hover:bg-brand-light-gray/50"
                            >
                                Logout
                            </a>
                        </div>
                    )}
                </div>
            </div>
            {!currentUser && (
                <button onClick={() => navigate('login')} className="hidden sm:block bg-brand-green text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-opacity-90 transition-colors">
                    Login
                </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;