import React, { useState, useEffect, useRef, useMemo, FC } from 'react';
import { EmbedScrollerSettings, EmbedSlide } from '../types';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';

const EmbedRenderer: FC<{ slide: EmbedSlide, isVisible: boolean }> = ({ slide, isVisible }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (isVisible) {
                videoRef.current.play().catch(e => console.error("Autoplay was prevented.", e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isVisible]);

    switch (slide.type) {
        case 'youtube':
            const youtubeSrc = `https://www.youtube.com/embed/${slide.content}?autoplay=${isVisible ? 1 : 0}&mute=1&loop=1&playlist=${slide.content}&controls=0&modestbranding=1&showinfo=0&rel=0`;
            return (
                <iframe
                    className="w-full h-full"
                    src={youtubeSrc}
                    title={slide.caption || 'YouTube video player'}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    key={isVisible ? 'visible' : 'hidden'} 
                ></iframe>
            );
        case 'video':
            return <video ref={videoRef} src={slide.content} muted loop className="w-full h-full object-cover" playsInline />;
        case 'html':
            return <div className="w-full h-full overflow-auto p-4 bg-white" dangerouslySetInnerHTML={{ __html: slide.content }} />;
        case 'iframe':
            return <iframe src={slide.content} className="w-full h-full" sandbox="allow-scripts allow-same-origin" frameBorder="0" title={slide.caption || 'Embedded content'}></iframe>;
        default:
            return <div className="w-full h-full bg-gray-200 flex items-center justify-center"><p>Unsupported embed type</p></div>;
    }
};


const EmbedScroller: FC<{ section: EmbedScrollerSettings }> = ({ section }) => {
    const slides = useMemo(() => section.slides ? Object.keys(section.slides).map(key => ({ id: key, ...section.slides[key] })) : [], [section.slides]);
    
    const [currentIndex, setCurrentIndex] = useState(1);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    
    const processedSlides = useMemo(() => {
        if (slides.length === 0) return [];
        return [slides[slides.length - 1], ...slides, slides[0]];
    }, [slides]);
    
    const resetTimeout = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };

    useEffect(() => {
        if (section.autoplay && slides.length > 1) {
            resetTimeout();
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, section.interval || 5000);
        }
        return () => resetTimeout();
    }, [currentIndex, section.autoplay, section.interval, slides.length]);

    const handleTransitionEnd = () => {
        if (sliderRef.current) {
            sliderRef.current.style.transition = 'none';
        }
        if (currentIndex <= 0) {
            setCurrentIndex(slides.length);
        } else if (currentIndex >= slides.length + 1) {
            setCurrentIndex(1);
        }
    };
    
    useEffect(() => {
        if (sliderRef.current && sliderRef.current.style.transition === 'none') {
            const timer = setTimeout(() => {
                 if (sliderRef.current) sliderRef.current.style.transition = 'transform 500ms ease-in-out';
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [currentIndex]);
    
    if (!section.enabled || slides.length === 0) return null;

    const nextSlide = () => setCurrentIndex(prev => prev + 1);
    const prevSlide = () => setCurrentIndex(prev => prev - 1);

    return (
        <section className="py-12 bg-brand-bg relative z-10">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                 <h2 className="text-4xl font-serif font-bold text-center text-brand-text mb-12">{section.title}</h2>
                 <div className="relative group overflow-hidden rounded-lg shadow-lg" style={{ height: section.height || '60vh' }}>
                     <div
                        ref={sliderRef}
                        className="flex h-full"
                        style={{ 
                            transform: `translateX(-${currentIndex * 100}%)`,
                            transition: 'transform 500ms ease-in-out'
                        }}
                        onTransitionEnd={handleTransitionEnd}
                    >
                        {processedSlides.map((slide, index) => (
                            <div key={`${slide.id}-${index}`} className="flex-shrink-0 w-full h-full relative">
                                <EmbedRenderer slide={slide} isVisible={currentIndex === index} />
                                {slide.caption && (
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 text-white text-center">
                                        <p>{slide.caption}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                     {slides.length > 1 && <>
                        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-label="Previous slide"><ArrowLeftIcon className="w-6 h-6 text-black" /></button>
                        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-label="Next slide"><ArrowRightIcon className="w-6 h-6 text-black" /></button>
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                             {slides.map((_, index) => {
                                 const slideIndex = index + 1;
                                 const isActive = slideIndex === currentIndex || (currentIndex === 0 && slideIndex === slides.length) || (currentIndex === slides.length + 1 && slideIndex === 1);
                                 return <button key={index} onClick={() => setCurrentIndex(slideIndex)} className={`w-3 h-3 rounded-full transition-colors duration-300 ${isActive ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`} aria-label={`Go to slide ${slideIndex}`} />;
                             })}
                         </div>
                     </>}
                 </div>
            </div>
        </section>
    );
};

export default EmbedScroller;