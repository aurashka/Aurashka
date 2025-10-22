import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { TestimonialsSettings, Author } from '../types';
import LazyImage from './LazyImage';

const Testimonials: React.FC = () => {
    const [settings, setSettings] = useState<TestimonialsSettings | null>(null);
    const [authors, setAuthors] = useState<Author[]>([]);

    useEffect(() => {
        const testimonialsRef = db.ref('site_settings/testimonials');
        const listener = testimonialsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            setSettings(data);
            if (data?.enabled && data.authors) {
                const authorsList = Object.keys(data.authors).map(key => ({
                    id: key,
                    ...data.authors[key]
                }));
                setAuthors(authorsList);
            } else {
                setAuthors([]);
            }
        });
        return () => testimonialsRef.off('value', listener);
    }, []);

    if (!settings?.enabled || authors.length === 0) {
        return null;
    }

    return (
        <section className="py-24 bg-brand-bg">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-serif font-bold text-center text-brand-text mb-16">{settings.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {authors.map((author) => (
                        <div key={author.id} className="bg-brand-surface p-8 rounded-lg shadow-sm text-center">
                            <LazyImage
                                wrapperClassName="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                                src={author.image}
                                alt={author.name}
                                className="w-full h-full object-cover rounded-full"
                            />
                            <p className="text-brand-secondary italic">"{author.quote}"</p>
                            <h3 className="mt-4 text-lg font-bold font-serif text-brand-text">{author.name}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// FIX: The Testimonials component was not exported, causing an import error.
export default Testimonials;
