import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { Product, ProductPageSettings, Category } from '../types';
import ProductCard from './ProductCard';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { ProductCardSkeleton } from './Skeletons';

interface RecommendedProductsProps {
    product: Product;
}

const RecommendedProducts: React.FC<RecommendedProductsProps> = ({ product }) => {
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Partial<ProductPageSettings>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const settingsRef = db.ref('site_settings/productPage');
        const categoriesRef = db.ref('categories');
        const settingsListener = settingsRef.on('value', snapshot => {
            setSettings(snapshot.val() || {});
        });
        const categoryListener = categoriesRef.on('value', snapshot => {
            const data = snapshot.val();
            setCategories(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
        });
        return () => {
            settingsRef.off('value', settingsListener);
            categoriesRef.off('value', categoryListener);
        };
    }, []);

    useEffect(() => {
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allProducts: Product[] = Object.keys(data)
                    .map(key => ({ id: key, ...data[key] }))
                    .filter(p => p.isVisible !== false && String(p.id) !== String(product.id));

                let recommended: Product[] = [];
                const perProductRecs = product.recommendations;
                
                // 1. Highest Priority: Per-product manual recommendations
                if (perProductRecs && (Object.keys(perProductRecs.relatedProductIds || {}).length > 0 || Object.keys(perProductRecs.relatedCategoryIds || {}).length > 0)) {
                    const recommendedSet = new Set<Product>();
                    const relatedProductIds = Object.keys(perProductRecs.relatedProductIds || {});
                    const relatedCategoryIds = Object.keys(perProductRecs.relatedCategoryIds || {});
                    
                    // Add directly selected products
                    allProducts.forEach(p => {
                        if (relatedProductIds.includes(String(p.id))) {
                            recommendedSet.add(p);
                        }
                    });

                    // Add products from selected categories
                    if (relatedCategoryIds.length > 0) {
                        const categoryNames = categories
                            .filter(c => relatedCategoryIds.includes(c.id))
                            .map(c => c.name);
                        
                        allProducts.forEach(p => {
                            if (categoryNames.includes(p.category)) {
                                recommendedSet.add(p);
                            }
                        });
                    }
                    recommended = Array.from(recommendedSet);
                } else {
                    // 2. Fallback to global settings
                    switch (settings.recommendationMode) {
                        case 'category':
                            const categoryIds = settings.recommendedCategoryIds ? Object.keys(settings.recommendedCategoryIds) : [];
                            if (categoryIds.length > 0) {
                                const categoryNames = categories.filter(c => categoryIds.includes(c.id)).map(c => c.name);
                                recommended = allProducts.filter(p => categoryNames.includes(p.category));
                            }
                            break;
                        case 'random':
                            recommended = [...allProducts];
                            break;
                        case 'manual':
                        default:
                            recommended = allProducts.filter(p => p.category === product.category);
                            break;
                    }
                }
                
                setRecommendedProducts(recommended.sort(() => 0.5 - Math.random()).slice(0, 10));
            }
            setLoading(false);
        });

        return () => productsRef.off('value', listener);
    }, [product, settings, categories]);
    
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

    if (recommendedProducts.length === 0 || settings.enableRecommendedProducts === false) {
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
                    {recommendedProducts.map(p => (
                        <div key={p.id} className="flex-shrink-0 w-64 md:w-72">
                             <ProductCard product={p} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RecommendedProducts;