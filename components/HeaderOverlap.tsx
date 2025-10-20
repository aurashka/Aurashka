import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { HeaderOverlapImageSettings } from '../types';
import LazyImage from './LazyImage';

const HeaderOverlap: React.FC = () => {
    const [settings, setSettings] = useState<HeaderOverlapImageSettings | null>(null);

    useEffect(() => {
        const settingsRef = db.ref('site_settings/headerOverlapImage');
        const listener = settingsRef.on('value', (snapshot) => {
            setSettings(snapshot.val());
        });
        return () => settingsRef.off('value', listener);
    }, []);

    if (!settings || !settings.enabled || !settings.imageUrl) {
        return null;
    }

    const style: React.CSSProperties = {
        position: 'fixed',
        top: settings.top || '0px',
        width: settings.width || 'auto',
        height: settings.height || 'auto',
        opacity: settings.opacity ?? 1,
        zIndex: settings.zIndex ?? 25,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease-in-out',
    };

    switch(settings.position) {
        case 'full':
            style.left = '0';
            style.right = '0';
            style.width = '100%';
            break;
        case 'left':
            style.left = '0';
            break;
        case 'right':
            style.right = '0';
            break;
        case 'center':
            style.left = '50%';
            style.transform = 'translateX(-50%)';
            break;
    }

    return (
        <LazyImage
            wrapperStyle={style}
            wrapperClassName="animate-fade-in-up"
            src={settings.imageUrl}
            alt="Header overlap decoration"
            className="w-full h-full"
        />
    );
};

export default HeaderOverlap;