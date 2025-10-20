import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { ProductCardSkeleton } from './Skeletons';

interface RecommendedProductsProps {
    category: string;
    currentProductId: string | number;
}

const RecommendedProducts: React.FC<RecommendedProductsProps> = ({ category, currentProductId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allProducts: Product[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                const recommended = allProducts
                    .filter(p => p.category === category && String(p.id) !== String(currentProductId) && p.isVisible !== false)
                    .sort(() => 0.5 - Math.random()) // Shuffle
                    .slice(0, 8); // Take up to 8
                setProducts(recommended);
            }
            setLoading(false);
        });

        return () => productsRef.off('value', listener);
    }, [category, currentProductId]);
    
    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    if (loading) {
        return (
            <section className="py-24 bg-brand-surface">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-serif font-bold text-brand-text mb-8">You Might Also Like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
            </section>
        )
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <section className="py-24 bg-brand-surface">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-serif font-bold text-brand-text">You Might Also Like</h2>
                     <div className="hidden sm:flex items-center space-x-2">
                        <button onClick={() => handleScroll('left')} className="p-3 border border-brand-light-gray rounded-full hover:bg-brand-light-gray/50 transition-colors">
                            <ArrowLeftIcon className="w-5 h-5 text-brand-secondary" />
                        </button>
                        <button onClick={() => handleScroll('right')} className="p-3 bg-brand-green border border-brand-green rounded-full hover:bg-opacity-90 transition-colors">
                            <ArrowRightIcon className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-6 pb-4 scrollbar-hide -mx-4 px-4">
                    {products.map(product => (
                        <div key={product.id} className="flex-shrink-0 w-64 md:w-72">
                             <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RecommendedProducts;
