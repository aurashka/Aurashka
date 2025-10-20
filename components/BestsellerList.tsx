import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { Product, BestsellerListSettings } from '../types';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from './Skeletons';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';

interface BestsellerListProps {
    section: BestsellerListSettings;
}

const BestsellerList: React.FC<BestsellerListProps> = ({ section }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!section.productIds || Object.keys(section.productIds).length === 0) {
            setProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const productIds = Object.keys(section.productIds);
        const productsRef = db.ref('products');

        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const allProducts: Product[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            const filtered = allProducts.filter(p => productIds.includes(String(p.id)) && p.isVisible !== false);
            setProducts(filtered);
            setLoading(false);
        });

        return () => productsRef.off('value', listener);
    }, [section.productIds]);
    
    const productsToDisplay = useMemo(() => {
        if (section.layout === 'grid' && section.rows && section.gridCols) {
            return products.slice(0, section.rows * section.gridCols);
        }
        return products;
    }, [products, section]);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
        }
    };
    
    if (loading) {
        const skeletonCount = section.layout === 'grid' ? (section.gridCols || 4) * (section.rows || 1) : section.itemsToShow || 4;
        return (
            <section className="py-24 bg-brand-surface">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="text-center mb-16"><h2 className="text-4xl font-serif font-bold text-brand-text">{section.title}</h2></div>
                     <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${section.gridCols || 4} gap-x-8 gap-y-12`}>
                        {Array.from({ length: skeletonCount }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
            </section>
        )
    }

    if (productsToDisplay.length === 0) {
        return null;
    }

    return (
        <section className="py-24 bg-brand-surface">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16"><h2 className="text-4xl font-serif font-bold text-brand-text">{section.title}</h2></div>
                {section.layout === 'horizontal-scroll' ? (
                    <div className="relative">
                        <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 space-x-6">
                            {productsToDisplay.map(product => (
                                <div key={product.id} className="snap-start flex-shrink-0" style={{ width: `calc((100% - ${(section.itemsToShow || 4) - 1} * 1.5rem) / ${section.itemsToShow || 4})` }}>
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                        <button onClick={() => handleScroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md hover:bg-brand-surface transition-transform active:scale-95 hidden md:block" aria-label="Scroll left"><ArrowLeftIcon className="w-6 h-6 text-brand-text" /></button>
                        <button onClick={() => handleScroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-brand-surface/80 p-3 rounded-full shadow-md hover:bg-brand-surface transition-transform active:scale-95 hidden md:block" aria-label="Scroll right"><ArrowRightIcon className="w-6 h-6 text-brand-text" /></button>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${section.gridCols || 4} gap-x-8 gap-y-12`}>
                        {productsToDisplay.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BestsellerList;
