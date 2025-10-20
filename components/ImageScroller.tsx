import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { useNavigation } from '../contexts/NavigationContext';
import { ImageScrollerSettings, PosterSlide } from '../types';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import LazyImage from './LazyImage';

const ImageScroller: React.FC = () => {
    const { navigate } = useNavigation();
    const [settings, setSettings] = useState<ImageScrollerSettings | null>(null);
    const [slides, setSlides] = useState<PosterSlide[]>([]);
    
    const [currentIndex, setCurrentIndex] = useState(1);
    const [transitionDuration, setTransitionDuration] = useState(500);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const scrollerRef = db.ref('site_settings/imageScroller');
        const listener = scrollerRef.on('value', (snapshot) => {
            const data = snapshot.val();
            setSettings(data);
            if (data?.enabled && data.slides) {
                const slidesArray = Object.values(data.slides);
                setSlides(slidesArray);
            } else {
                setSlides([]);
            }
        });
        return () => scrollerRef.off('value', listener);
    }, []);

    const processedSlides = useMemo(() => {
        if (slides.length === 0) return [];
        return [slides[slides.length - 1], ...slides, slides[0]];
    }, [slides]);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const nextSlide = () => {
        if (currentIndex >= slides.length + 1) return;
        setCurrentIndex(prev => prev + 1);
    };

    const prevSlide = () => {
        if (currentIndex <= 0) return;
        setCurrentIndex(prev => prev - 1);
    };

    useEffect(() => {
        if (!settings?.enabled || slides.length <= 1) return;
        
        resetTimeout();
        timeoutRef.current = setTimeout(nextSlide, 5000);
        return () => resetTimeout();
    }, [currentIndex, settings, slides.length]);

    const handleTransitionEnd = () => {
        if (currentIndex <= 0) {
            setTransitionDuration(0);
            setCurrentIndex(slides.length);
        } else if (currentIndex >= slides.length + 1) {
            setTransitionDuration(0);
            setCurrentIndex(1);
        }
    };
    
    useEffect(() => {
        if (transitionDuration === 0) {
            const timer = setTimeout(() => setTransitionDuration(500), 50);
            return () => clearTimeout(timer);
        }
    }, [transitionDuration]);


    const handleSlideClick = (slide: PosterSlide) => {
        if (slide.linkType === 'none' || !slide.link) return;

        switch (slide.linkType) {
            case 'internal': navigate(slide.link as any); break;
            case 'external': window.open(slide.link, '_blank', 'noopener,noreferrer'); break;
            case 'product': navigate('product', { productId: slide.link }); break;
            case 'category':
                const [categoryId, categoryName = 'Category'] = slide.link.split(':');
                navigate('shop', { categoryId, categoryName });
                break;
            default: break;
        }
    };
    
    if (!settings?.enabled || slides.length === 0) {
        return null;
    }
    
    return (
        <section className="py-12 bg-brand-surface relative z-10">
            <div className="relative w-full group overflow-hidden max-w-screen-xl mx-auto rounded-lg shadow-sm">
                <div
                    className="flex"
                    style={{ 
                        transform: `translateX(-${currentIndex * 100}%)`,
                        transition: `transform ${transitionDuration}ms ease-in-out`
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {processedSlides.map((slide, index) => (
                        <div key={`${slide.id}-${index}`} className="flex-shrink-0 w-full snap-start">
                            <div
                                onClick={() => handleSlideClick(slide)}
                                className={`relative block w-full aspect-[16/7] overflow-hidden ${slide.linkType !== 'none' ? 'cursor-pointer' : ''}`}
                            >
                                <LazyImage wrapperClassName="w-full h-full" src={slide.image} alt={slide.altText || 'Promotional Poster'} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/10"></div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {slides.length > 1 && <>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-label="Scroll left">
                        <ArrowLeftIcon className="w-6 h-6 text-brand-text" />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-label="Scroll right">
                        <ArrowRightIcon className="w-6 h-6 text-brand-text" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                        {slides.map((_, index) => {
                            const slideIndex = index + 1;
                            const isActive = slideIndex === currentIndex || (currentIndex === 0 && slideIndex === slides.length) || (currentIndex === slides.length + 1 && slideIndex === 1);
                            return (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(slideIndex)}
                                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isActive ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`}
                                    aria-label={`Go to slide ${slideIndex}`}
                                />
                            );
                        })}
                    </div>
                </>}
            </div>
        </section>
    );
};

export default ImageScroller;