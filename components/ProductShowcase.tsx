import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { db } from '../firebase';
import { Product, DecorativeOverlay, ProductShowcaseSettings } from '../types';
import { ProductCardSkeleton } from './Skeletons';
import LazyImage from './LazyImage';

const ProductShowcase: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ProductShowcaseSettings | null>(null);
  const [overlay, setOverlay] = useState<DecorativeOverlay | null>(null);

  useEffect(() => {
    const productsRef = db.ref('products');
    const settingsRef = db.ref('site_settings/productShowcaseSection');
    const overlayRef = db.ref('site_settings/decorativeOverlays/productShowcase');

    const productListener = productsRef.on('value', (snapshot) => {
      const productsData = snapshot.val();
      if (productsData) {
        const productsList: Product[] = Object.keys(productsData).map(key => ({
          id: key,
          ...productsData[key]
        }));
        setProducts(productsList);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });

    const settingsListener = settingsRef.on('value', (snapshot) => {
      setSettings(snapshot.val());
    });
    
    const overlayListener = overlayRef.on('value', snapshot => {
        setOverlay(snapshot.val());
    });

    return () => {
      productsRef.off('value', productListener);
      settingsRef.off('value', settingsListener);
      overlayRef.off('value', overlayListener);
    };
  }, []);

  if (!settings?.enabled) {
    return null;
  }

  const popularProducts = products.filter(p => p.isPopular && p.isVisible !== false).slice(0, 6);

  return (
    <section className="py-24 bg-brand-surface overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-4xl font-serif font-bold text-brand-text">Popular Products</h2>
                    <p className="mt-2 text-brand-secondary max-w-md">Discover our handpicked selection of popular beauty essentials.</p>
                </div>
                <div className="hidden sm:flex items-center space-x-2">
                    <button className="p-3 border border-brand-light-gray rounded-full hover:bg-brand-light-gray/50 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-brand-secondary" />
                    </button>
                    <button className="p-3 bg-brand-green border border-brand-green rounded-full hover:bg-opacity-90 transition-colors">
                        <ArrowRightIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : popularProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 animate-fade-in-up">
                {popularProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center col-span-full text-brand-secondary animate-fade-in-up">No popular products have been selected yet.</div>
            )}
          </div>
          <div className="relative h-[600px] hidden lg:block">
            <LazyImage 
                wrapperClassName="absolute inset-0 w-full h-full rounded-lg shadow-xl"
                src={settings.image} 
                alt="Model with flawless skin" 
                className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/10 rounded-lg"></div>
            {overlay?.url && (
                <div 
                    className="absolute inset-0 rounded-lg bg-contain bg-no-repeat bg-center pointer-events-none"
                    style={{
                        backgroundImage: `url('${overlay.url}')`,
                        opacity: overlay.opacity ?? 1,
                    }}
                ></div>
            )}
            <div className="absolute bottom-10 left-10 text-white">
                <h3 className="text-5xl font-serif font-bold">{settings.text}</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;