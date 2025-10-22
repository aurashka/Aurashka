import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { AnnouncementBarSettings, Product } from '../types';
import CountdownTimer from './CountdownTimer';
import { ArrowRightIcon } from './Icons';

const AnnouncementBar: React.FC = () => {
    const { theme } = useTheme();
    const { navigate } = useNavigation();
    const [settings, setSettings] = useState<AnnouncementBarSettings | null>(null);
    const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);

    useEffect(() => {
        const announcementRef = db.ref('site_settings/announcementBar');
        const listener = announcementRef.on('value', (snapshot) => {
            setSettings(snapshot.val());
        });
        return () => announcementRef.off('value', listener);
    }, []);

    useEffect(() => {
        if (settings?.featuredProductOfferId) {
            const productRef = db.ref(`products/${settings.featuredProductOfferId}`);
            const listener = productRef.on('value', (snapshot) => {
                setFeaturedProduct(snapshot.val() ? { id: settings.featuredProductOfferId, ...snapshot.val() } : null);
            });
            return () => productRef.off('value', listener);
        } else {
            setFeaturedProduct(null);
        }
    }, [settings?.featuredProductOfferId]);

    const handleLinkClick = (e: React.MouseEvent, type: 'main' | 'product') => {
        if (type === 'product' && featuredProduct) {
            e.preventDefault();
            navigate('product', { productId: featuredProduct.id });
            return;
        }

        if (!settings?.linkConfig || settings.linkConfig.linkType === 'none') {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        const { linkType, link } = settings.linkConfig;
        
        switch (linkType) {
            case 'internal': navigate(link as any); break;
            case 'external': window.open(link, '_blank', 'noopener,noreferrer'); break;
            case 'product': navigate('product', { productId: link }); break;
            case 'category':
                const [categoryId, categoryName] = link.split(':');
                navigate('shop', { categoryId, categoryName });
                break;
            default: break;
        }
    };

    if (
        !settings ||
        !settings.enabled ||
        !settings.text ||
        !settings.displayOnThemes?.[theme]
    ) {
        return null;
    }

    const offer = featuredProduct?.offer?.enabled ? featuredProduct.offer : null;

    const barStyle: React.CSSProperties = {
        backgroundColor: settings.backgroundColor || 'rgb(var(--color-primary))',
        color: settings.textColor || 'white',
    };

    const displayText = offer ? `${settings.text} - ${offer.title}` : settings.text;
    const hasLink = settings.linkConfig && settings.linkConfig.linkType !== 'none';
    const linkText = settings.linkConfig?.linkText || 'Shop Now';

    const barClasses = `w-full py-2 px-4 text-center text-sm font-medium overflow-hidden relative z-50 ${settings.position === 'sticky' ? 'sticky top-0' : ''}`;

    const content = (
        <div style={barStyle} className={barClasses}>
            <div className="max-w-screen-xl mx-auto flex items-center justify-center gap-4">
                <div className="flex-grow overflow-hidden relative h-6">
                     <div className="absolute inset-0 flex items-center">
                        <div className="whitespace-nowrap animate-marquee flex-shrink-0">
                             <span>{displayText}</span>
                             <span className="mx-8">&bull;</span>
                             <span>{displayText}</span>
                             <span className="mx-8">&bull;</span>
                        </div>
                         <div className="whitespace-nowrap animate-marquee flex-shrink-0">
                             <span>{displayText}</span>
                             <span className="mx-8">&bull;</span>
                             <span>{displayText}</span>
                             <span className="mx-8">&bull;</span>
                        </div>
                    </div>
                </div>
                 {offer?.endDate && (
                    <div className="flex-shrink-0">
                        <CountdownTimer endDate={offer.endDate} className="text-xs" />
                    </div>
                )}
                {offer && (
                     <a href="#" onClick={(e) => handleLinkClick(e, 'product')} className="flex-shrink-0 ml-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
                        <span>{linkText}</span>
                        <ArrowRightIcon className="w-3 h-3"/>
                    </a>
                )}
            </div>
        </div>
    );

    if (hasLink && !offer) {
        return (
            <a href={settings.linkConfig?.link} onClick={(e) => handleLinkClick(e, 'main')} className="block cursor-pointer">
                {content}
            </a>
        );
    }

    return content;
};

export default AnnouncementBar;
