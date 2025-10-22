import React, { useState, useEffect } from 'react';
import { ArrowRightIcon } from './Icons';
import { db } from '../firebase';
import { HeroSettings, DecorativeOverlay } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import LazyImage from './LazyImage';

const Hero: React.FC = () => {
    const { navigate } = useNavigation();
    const [content, setContent] = useState<Partial<HeroSettings>>({
        image: 'https://images.unsplash.com/photo-1598453532392-0a174393c9d0?q=80&w=2070&auto=format&fit=crop&ixlib-rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        preheadline: 'Natural beauty products on display',
        headline: 'Made for you!',
        subheadline: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum.',
        overlayColor: 'rgba(255, 255, 255, 0.5)',
        buttonText: 'Shop Now',
        buttonLinkType: 'internal',
        buttonLink: 'shop',
        fontSizes: {
            preheadline: 36,
            headline: 80,
            subheadline: 18
        },
        imageStyles: {
            desktop: { zoom: 100, focusX: 50, focusY: 50 },
            mobile: { zoom: 100, focusX: 50, focusY: 50 }
        }
    });
    const [overlay, setOverlay] = useState<DecorativeOverlay | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const heroRef = db.ref('site_settings/heroSection');
        const overlayRef = db.ref('site_settings/decorativeOverlays/hero');

        const listener = heroRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setContent(prev => ({
                    ...prev,
                    ...data,
                    fontSizes: { ...prev.fontSizes, ...(data.fontSizes || {}) },
                    imageStyles: { ...(prev.imageStyles || {}), ...(data.imageStyles || {}) }
                }));
            }
            setLoading(false);
        });
        
        const overlayListener = overlayRef.on('value', snapshot => {
            setOverlay(snapshot.val());
        });

        return () => {
            heroRef.off('value', listener);
            overlayRef.off('value', overlayListener);
        }
    }, []);
    
    const handleButtonClick = () => {
        if (!content.buttonLinkType || content.buttonLinkType === 'none' || !content.buttonLink) return;
        
        switch (content.buttonLinkType) {
            case 'internal':
                navigate(content.buttonLink as any);
                break;
            case 'external':
                window.open(content.buttonLink, '_blank', 'noopener,noreferrer');
                break;
            case 'product':
                navigate('product', { productId: content.buttonLink });
                break;
            case 'category': {
                const [categoryId, categoryName] = content.buttonLink.split(':');
                navigate('shop', { categoryId, categoryName });
                break;
            }
            default:
                break;
        }
    };

    const desktopZoom = content.imageStyles?.desktop?.zoom || 100;
    const desktopFocusX = content.imageStyles?.desktop?.focusX ?? 50;
    const desktopFocusY = content.imageStyles?.desktop?.focusY ?? 50;
    const desktopFocus = `${desktopFocusX}% ${desktopFocusY}%`;

    const mobileZoom = content.imageStyles?.mobile?.zoom || 100;
    const mobileFocusX = content.imageStyles?.mobile?.focusX ?? 50;
    const mobileFocusY = content.imageStyles?.mobile?.focusY ?? 50;
    const mobileFocus = `${mobileFocusX}% ${mobileFocusY}%`;


    const imageCustomStyles = `
      .hero-image {
        transform: scale(${mobileZoom / 100});
        object-position: ${mobileFocus};
        transition: transform 0.3s ease-out, object-position 0.3s ease-out;
      }
      @media (min-width: 768px) {
        .hero-image {
          transform: scale(${desktopZoom / 100});
          object-position: ${desktopFocus};
        }
      }
      .force-desktop-view .hero-image {
        transform: scale(${desktopZoom / 100});
        object-position: ${desktopFocus};
      }
    `;

    if (loading) {
        return (
            <section className="relative pt-24 min-h-[700px] lg:min-h-screen flex items-center">
                <div className="absolute inset-0 overflow-hidden bg-brand-light-gray animate-pulse"></div>
                <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-xl">
                        <div className="h-10 bg-brand-light-gray/80 rounded w-1/2 animate-pulse"></div>
                        <div className="mt-2 h-24 bg-brand-light-gray/80 rounded w-full animate-pulse"></div>
                        <div className="mt-6 h-5 bg-brand-light-gray/80 rounded w-full animate-pulse"></div>
                        <div className="mt-2 h-5 bg-brand-light-gray/80 rounded w-5/6 animate-pulse"></div>
                        <div className="mt-8 h-12 bg-brand-light-gray/80 rounded-full w-48 animate-pulse"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <>
            <style>{imageCustomStyles}</style>
            <section className="relative pt-24 min-h-[700px] lg:min-h-screen flex items-center">
                <div className="absolute inset-0 overflow-hidden">
                    {content.image && (
                        <LazyImage
                            src={content.image}
                            alt={content.preheadline || "Hero background"}
                            wrapperClassName="w-full h-full"
                            className="hero-image w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0" style={{ backgroundColor: content.overlayColor }}></div>
                </div>
                {overlay?.url && (
                    <div 
                        className="absolute inset-0 z-10 pointer-events-none bg-cover bg-center" 
                        style={{
                            backgroundImage: `url('${overlay.url}')`,
                            opacity: overlay.opacity ?? 1,
                        }}
                    ></div>
                )}
                <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-20">
                    <div className="max-w-xl animate-fade-in-up">
                        <p 
                            className="font-script text-brand-green" 
                            style={{ fontSize: `${content.fontSizes?.preheadline || 36}px` }}
                        >
                            {content.preheadline}
                        </p>
                        <h1 
                            className="mt-2 font-extrabold font-serif text-brand-text tracking-tight"
                            style={{ fontSize: `${content.fontSizes?.headline || 80}px`, lineHeight: 1.1 }}
                        >
                            {content.headline}
                        </h1>
                        <p 
                            className="mt-6 text-lg text-brand-secondary"
                            style={{ fontSize: `${content.fontSizes?.subheadline || 18}px` }}
                        >
                            {content.subheadline}
                        </p>
                        {content.buttonLinkType !== 'none' && (
                            <div className="mt-8">
                                <button 
                                    onClick={handleButtonClick}
                                    className="group inline-flex items-center bg-brand-green text-white px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg"
                                >
                                    {content.buttonText}
                                    <ArrowRightIcon className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};

export default Hero;