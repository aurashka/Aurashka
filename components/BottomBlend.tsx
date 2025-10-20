import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { BottomBlendSettings } from '../types';

const BottomBlend: React.FC = () => {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<BottomBlendSettings | null>(null);

    useEffect(() => {
        const settingsRef = db.ref('site_settings/bottomBlend');
        const listener = settingsRef.on('value', (snapshot) => {
            setSettings(snapshot.val());
        });
        return () => settingsRef.off('value', listener);
    }, []);

    if (
        !settings ||
        !settings.enabled ||
        !settings.imageUrl ||
        !(settings.displayOnThemes?.[theme])
    ) {
        return null;
    }
    
    const isDarkTheme = theme.includes('dark');
    const activeImageUrl = (isDarkTheme && settings.darkImageUrl) ? settings.darkImageUrl : settings.imageUrl;

    const style: React.CSSProperties = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: settings.height || '350px',
        backgroundImage: `url('${activeImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        opacity: settings.opacity ?? 0.5,
        zIndex: 0, // Behind footer and other content
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease-in-out, background-image 0.5s ease-in-out',
    };

    return <div style={style} className="bottom-blend-mask" aria-hidden="true"></div>;
};

export default BottomBlend;