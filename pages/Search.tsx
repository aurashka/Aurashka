import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { useSiteSettings } from '../contexts/SettingsContext';
import { SearchIcon } from '../components/Icons';
import { ProductCardSkeleton } from '../components/Skeletons';

const Search: React.FC = () => {
    const settings = useSiteSettings();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const pageTitle = settings.searchPage?.title || 'Search Our Products';

    useEffect(() => {
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const productsList: Product[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setProducts(productsList.filter(p => p.isVisible !== false));
            setLoading(false);
        });
        return () => productsRef.off('value', listener);
    }, []);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        return products.filter(product => 
            product.name.toLowerCase().includes(lowercasedTerm) ||
            product.description.toLowerCase().includes(lowercasedTerm) ||
            product.category.toLowerCase().includes(lowercasedTerm) ||
            product.subcategory?.toLowerCase().includes(lowercasedTerm) ||
            (product.tags && Object.values(product.tags).some(tag => (tag as any).text.toLowerCase().includes(lowercasedTerm)))
        );
    }, [products, searchTerm]);

    return (
        <section className="py-24 bg-brand-bg min-h-[60vh]">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-serif font-bold text-brand-text">{pageTitle}</h1>
                </div>
                <div className="mb-12 max-w-2xl mx-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for products, ingredients, and more..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-brand-surface border border-brand-light-gray text-brand-text rounded-full focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green text-lg"
                            autoFocus
                        />
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-brand-secondary" />
                    </div>
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                ) : searchTerm ? (
                    filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up">
                            {filteredProducts.map(product => (
                                <div key={product.id}>
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-brand-secondary">No products found for "{searchTerm}".</p>
                    )
                ) : (
                    <p className="text-center text-brand-secondary">Start typing to see results.</p>
                )}
            </div>
        </section>
    );
};

export default Search;
