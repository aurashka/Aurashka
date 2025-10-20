import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { Product, OfferSectionSettings } from '../types';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './Skeletons';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import LazyImage from './LazyImage';

interface CustomSectionProps {
    section: OfferSectionSettings;
}

const CustomOfferSection: React.FC<CustomSectionProps> = ({ section }) => {
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoading(true);
        if (!section.productIds) {
            setFeaturedProducts([]);
            setLoading(false);
            return;
        }

        const productIds = Object.keys(section.productIds);
        if (productIds.length === 0) {
             setFeaturedProducts([]);
             setLoading(false);
             return;
        }
        
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const allProducts: Product[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            const filtered = allProducts.filter(p => productIds.includes(String(p.id)) && p.isVisible !== false);
            setFeaturedProducts(filtered);
            setLoading(false);
        });

        return () => productsRef.off('value', listener);
    }, [section.productIds]);
    
    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8; // Scroll by 80% of visible width
            container.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    const renderContent = () => {
        if (loading) {
            const skeletonCount = Object.keys(section.productIds || {}).length || 4;
            return (
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {Array.from({ length: skeletonCount }).map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
            );
        }

        if (featuredProducts.length === 0) {
             return <div className="mt-16 text-center text-brand-secondary">No special offers available in this section right now.</div>;
        }

        switch (section.layout) {
            case 'single':
                const singleProduct = featuredProducts[0];
                return (
                     <div className="mt-16 max-w-sm mx-auto animate-fade-in-up">
                        <ProductCard product={singleProduct} />
                    </div>
                );

            case 'horizontal-scroll':
                const itemsToShow = section.itemsToShow || 4;
                return (
                    <div className="mt-16 relative">
                        <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 space-x-6 py-10">
                            {featuredProducts.map(product => (
                                <div key={product.id} className="snap-start flex-shrink-0" style={{ width: `calc((100% - ${itemsToShow - 1} * 1.5rem) / ${itemsToShow})` }}>
                                    <ProductCard product={product} decorationImageUrl={section.decorationImageUrl} />
                                </div>
                            ))}
                        </div>
                        <button onClick={() => handleScroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md hover:bg-brand-surface transition-transform active:scale-95" aria-label="Scroll left"><ArrowLeftIcon className="w-6 h-6 text-brand-text" /></button>
                        <button onClick={() => handleScroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md hover:bg-brand-surface transition-transform active:scale-95" aria-label="Scroll right"><ArrowRightIcon className="w-6 h-6 text-brand-text" /></button>
                    </div>
                );
            
            case 'list':
                const alignmentClasses = { start: 'items-start', center: 'items-center', end: 'items-end' };
                return (
                    <div className={`mt-16 flex flex-col space-y-8 ${alignmentClasses[section.contentAlignment || 'center']} animate-fade-in-up`}>
                        {featuredProducts.map(product => (
                            <div key={product.id} className="w-full max-w-sm">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                );
            
            case 'grid':
            default:
                const gridCols = section.gridCols || 4;
                return (
                     <div className={`mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${gridCols} gap-x-8 gap-y-12 animate-fade-in-up`}>
                        {featuredProducts.map((product) => (
                           <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                );
        }
    };
    
    return (
        <section className="py-24 bg-brand-bg">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-4xl font-serif font-bold text-brand-text flex items-center justify-center gap-4">
                        {section.titleImageUrl && <LazyImage wrapperClassName="h-12 w-auto" src={section.titleImageUrl} alt="" className="h-12 w-auto" />}
                        <span>{section.title || 'Special Offers'}</span>
                    </h2>
                </div>
                {renderContent()}
            </div>
        </section>
    );
};

export default CustomOfferSection;