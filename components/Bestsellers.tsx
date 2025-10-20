import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { useNavigation } from '../contexts/NavigationContext';
import { ArrowRightIcon } from './Icons';
import { db } from '../firebase';
import { Product } from '../types';
import { ProductCardSkeleton } from './Skeletons';

const Bestsellers: React.FC = () => {
  const { navigate } = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = db.ref('products');
    const listener = productsRef.on('value', (snapshot) => {
      const productsData = snapshot.val();
      if (productsData) {
        const productsList: Product[] = Object.keys(productsData).map(key => ({
          id: key,
          ...productsData[key]
        }));
        // Filter for visible products and then shuffle
        setProducts(productsList.filter(p => p.isVisible !== false).sort(() => 0.5 - Math.random()));
      } else {
        setProducts([]);
      }
      setLoading(false);
    });

    return () => productsRef.off('value', listener);
  }, []);

  const bestSellerProducts = products.slice(0, 4);

  return (
    <section className="py-24 bg-brand-surface">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-serif font-bold text-brand-text">Bestseller Products</h2>
          <p className="mt-4 max-w-2xl mx-auto text-brand-secondary">
            See what everyone is loving right now. Our most popular and highly-rated products.
          </p>
        </div>
        {loading ? (
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : bestSellerProducts.length > 0 ? (
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 animate-fade-in-up">
            {bestSellerProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
           <div className="mt-16 text-center text-brand-secondary animate-fade-in-up">No bestsellers to show yet. Add some products to see them here!</div>
        )}
        <div className="mt-20 text-center">
            <button
                onClick={() => navigate('shop')}
                className="group inline-flex items-center bg-brand-green text-white px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg"
            >
                Explore All Products
                <ArrowRightIcon className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
            </button>
        </div>
      </div>
    </section>
  );
};

export default Bestsellers;