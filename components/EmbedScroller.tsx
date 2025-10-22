import React, { useState, useEffect, useMemo, FC, useRef } from 'react';
import { EmbedScrollerSettings, EmbedSlide } from '../types';

const EmbedRenderer: FC<{ slide: EmbedSlide }> = ({ slide }) => {
    const [isVisible, setIsVisible] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.6 } // At least 60% of the item must be visible to play
        );

        const currentElement = elementRef.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            if (isVisible) {
                videoRef.current.play().catch(e => console.error("Autoplay prevented:", e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isVisible]);
    
    const youtubeSrc = `https://www.youtube.com/embed/${slide.content}?enablejsapi=1&autoplay=${isVisible ? 1 : 0}&mute=1&loop=1&playlist=${slide.content}&controls=0&modestbranding=1&showinfo=0&rel=0`;

    return (
        <div ref={elementRef} className="w-full h-full bg-black">
            {
                (() => {
                    switch (slide.type) {
                        case 'youtube':
                            return (
                                <iframe
                                    className="w-full h-full"
                                    src={youtubeSrc}
                                    title={slide.caption || 'YouTube video player'}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    key={slide.id + (isVisible ? '-visible' : '-hidden')}
                                ></iframe>
                            );
                        case 'video':
                            return <video ref={videoRef} src={slide.content} muted loop playsInline className="w-full h-full object-cover" />;
                        case 'html':
                            return <div className="w-full h-full overflow-auto p-4 bg-white" dangerouslySetInnerHTML={{ __html: slide.content }} />;
                        case 'iframe':
                            return <iframe src={slide.content} className="w-full h-full" sandbox="allow-scripts allow-same-origin" frameBorder="0" title={slide.caption || 'Embedded content'}></iframe>;
                        default:
                            return <div className="w-full h-full bg-gray-200 flex items-center justify-center"><p>Unsupported embed type</p></div>;
                    }
                })()
            }
        </div>
    );
};


const EmbedScroller: FC<{ section: EmbedScrollerSettings }> = ({ section }) => {
    const slides = useMemo(() => section.slides ? (Object.values(section.slides) as Omit<EmbedSlide, 'id'>[]).map((slide, index) => ({ ...slide, id: Object.keys(section.slides)[index] })) : [], [section.slides]);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const container = scrollContainerRef.current;
        
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (!container || !section.autoplay || isHovered || slides.length <= 1) {
            return;
        }

        intervalRef.current = setInterval(() => {
            if (!scrollContainerRef.current) return;
            
            const currentContainer = scrollContainerRef.current;
            const isAtEnd = currentContainer.scrollLeft >= currentContainer.scrollWidth - currentContainer.clientWidth - 1;

            if (isAtEnd) {
                currentContainer.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                const firstSlide = currentContainer.children[0] as HTMLElement;
                if (!firstSlide) return;
                
                const margin = 32; // mx-4 is 1rem (16px) on each side
                const slideWidth = firstSlide.offsetWidth + margin;
                currentContainer.scrollBy({ left: slideWidth, behavior: 'smooth' });
            }
        }, section.interval || 3000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };

    }, [section.autoplay, section.interval, isHovered, slides]);
    
    if (!section.enabled || slides.length === 0) return null;

    return (
        <section className="py-12 bg-brand-bg relative z-10">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                 <h2 className="text-4xl font-serif font-bold text-center text-brand-text mb-12">{section.title}</h2>
                 <div 
                    className="group"
                    style={{ height: section.height || '250px' }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                 >
                    <div className="w-full h-full overflow-hidden">
                        <div
                            ref={scrollContainerRef}
                            className="flex h-full overflow-x-auto scrollbar-hide"
                        >
                            {slides.map((slide, index) => (
                                <div
                                    key={`${slide.id}-${index}`}
                                    className="flex-shrink-0 h-full mx-4 rounded-lg overflow-hidden shadow-lg"
                                    style={{
                                        width: section.slideWidth || '300px',
                                        aspectRatio: section.slideAspectRatio || 'auto',
                                    }}
                                >
                                    <div className="w-full h-full relative">
                                        <EmbedRenderer slide={slide} />
                                        {slide.caption && (
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-center text-sm truncate">
                                                <p>{slide.caption}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </div>
        </section>
    );
};

export default EmbedScroller;
