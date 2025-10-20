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
                <h2 className="text-4xl font-serif font-bold text-center text-brand-text mb-16">
                    {settings.title || 'What Our Customers Say'}
                </h2>
                <div className="flex overflow-x-auto space-x-8 pb-8 -mx-4 px-4 scrollbar-hide">
                    {authors.map((author) => (
                        <div key={author.id} className="flex-shrink-0 w-80 text-center p-6 bg-brand-surface rounded-lg shadow-sm">
                            <LazyImage
                                wrapperClassName="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-brand-surface shadow-md"
                                src={author.image}
                                alt={author.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                            <p className="text-brand-secondary italic mb-4">"{author.quote}"</p>
                            <h4 className="font-bold font-serif text-brand-text">{author.name}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;