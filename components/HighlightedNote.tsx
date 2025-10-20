import React from 'react';
import { HighlightedNoteSettings } from '../types';

interface HighlightedNoteProps {
    settings: HighlightedNoteSettings;
}

const HighlightedNote: React.FC<HighlightedNoteProps> = ({ settings }) => {
    if (!settings || !settings.enabled) {
        return null;
    }

    return (
        <section className="py-12" style={{ backgroundColor: settings.backgroundColor }}>
            <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div 
                    className="p-8 rounded-lg"
                    style={{ color: settings.textColor }}
                >
                    <h2 className="text-3xl font-serif font-bold">{settings.title}</h2>
                    <p className="mt-4 text-lg">
                        {settings.text}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default HighlightedNote;
