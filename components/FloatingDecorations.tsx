import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { FloatingDecoration } from '../types';
import LazyImage from './LazyImage';

const FloatingDecorations: React.FC = () => {
    const { theme } = useTheme();
    const [decorations, setDecorations] = useState<FloatingDecoration[]>([]);

    useEffect(() => {
        const decorRef = db.ref('site_settings/floatingDecorations');
        const listener = decorRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const decorList: FloatingDecoration[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setDecorations(decorList);
        });
        return () => decorRef.off('value', listener);
    }, []);

    const visibleDecorations = decorations.filter(d => {
        if (!d.enabled) return false;
        if (!d.displayOnThemes || Object.keys(d.displayOnThemes).length === 0) {
            return false;
        }
        return d.displayOnThemes[theme];
    });

    if (visibleDecorations.length === 0) {
        return null;
    }

    return (
        <>
            {visibleDecorations.map(decor => {
                const isDarkTheme = theme.includes('dark');
                const imageUrl = isDarkTheme && decor.darkImageUrl ? decor.darkImageUrl : decor.imageUrl;

                if (!imageUrl) return null;

                const style: React.CSSProperties = {
                    position: 'fixed',
                    top: decor.top,
                    left: decor.left,
                    right: decor.right,
                    width: decor.width,
                    height: decor.height || 'auto',
                    opacity: decor.opacity ?? 1,
                    zIndex: decor.zIndex ?? 0,
                    transform: `rotate(${decor.rotation || 0}deg)`,
                    pointerEvents: 'none',
                    transition: 'opacity 0.5s ease-in-out',
                };
                
                return (
                    <LazyImage
                        key={decor.id}
                        wrapperStyle={style}
                        wrapperClassName="animate-fade-in-up"
                        src={imageUrl}
                        alt="Decorative element"
                        className="w-full h-full"
                    />
                );
            })}
        </>
    );
};

export default FloatingDecorations;