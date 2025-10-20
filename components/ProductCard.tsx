import React, { useState, useMemo } from 'react';
import { Product, ProductVariant, Tag } from '../types';
import { useCart } from '../contexts/CartContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSiteSettings } from '../contexts/SettingsContext';
import { CartIcon, EyeIcon, XIcon, PlusIcon, MinusIcon } from './Icons';
import LazyImage from './LazyImage';

interface ProductCardProps {
  product: Product;
  decorationImageUrl?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, decorationImageUrl }) => {
  const { addToCart } = useCart();
  const { navigate } = useNavigation();
  const { enableGlobalCardOverlay } = useSiteSettings();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showControls, setShowControls] = useState(false);

  const productVariants = useMemo(() => {
    if (!product.variants) return [];
    return Object.keys(product.variants).map(key => ({
      id: key,
      ...product.variants![key],
    }));
  }, [product.variants]);

  const hasVariants = productVariants.length > 0;

  const currentPrice = selectedVariant?.price ?? product.price ?? 0;
  const currentOldPrice = selectedVariant?.oldPrice ?? product.oldPrice;
  const totalStock = useMemo(() => hasVariants
    ? productVariants.reduce((acc, v) => acc + v.stock, 0)
    : product.stock, [hasVariants, productVariants, product.stock]);
  
  const selectedVariantStock = selectedVariant?.stock ?? product.stock ?? 0;
  const isOutOfStock = totalStock <= 0;
  const applyOverlay = product.hasCustomOverlay || enableGlobalCardOverlay;


  const handleProductClick = () => {
    navigate('product', { productId: product.id });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    if (!hasVariants) {
      addToCart(product, 1);
    } else if (selectedVariant) {
      addToCart(product, quantity, selectedVariant);
    }
    // Optionally show some feedback
  };

  const handleVariantSelect = (e: React.MouseEvent, variant: ProductVariant) => {
      e.stopPropagation();
      if (variant.stock > 0) {
        setSelectedVariant(variant);
        setQuantity(1);
      }
  };

  const handleQuantityChange = (e: React.MouseEvent, amount: number) => {
      e.stopPropagation();
      setQuantity(q => {
          const newQuantity = q + amount;
          if (newQuantity < 1) return 1;
          if (newQuantity > selectedVariantStock) return selectedVariantStock;
          return newQuantity;
      });
  }
  
  const imageUrl = product?.images?.[0] || 'https://images.unsplash.com/photo-1580856526562-1b5e8a1c91f0?q=80&w=400&auto=format&fit=crop';

  return (
    <div 
      className="group text-center relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {decorationImageUrl && (
          <LazyImage 
            wrapperClassName="absolute -top-5 left-1/2 -translate-x-1/2 w-auto h-12 z-20"
            src={decorationImageUrl} 
            alt="decoration" 
            className="w-auto h-12 pointer-events-none filter drop-shadow-md" 
          />
      )}
      <div className={`relative bg-brand-light-gray/70 cursor-pointer overflow-hidden rounded-lg ${applyOverlay ? 'has-custom-overlay' : ''}`}>
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1">
            {product.tags && Object.values(product.tags).slice(0, 2).map((tag, index) => (
                <span key={index} className="text-xs text-white px-2 py-1 rounded-full shadow" style={{ backgroundColor: (tag as Tag).color || '#6B7F73' }}>
                    {(tag as Tag).text}
                </span>
            ))}
        </div>
        
        {!hasVariants && (
             <button 
                onClick={handleAddToCart} 
                className="absolute top-3 right-3 bg-brand-surface p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 hover:bg-brand-green hover:text-white disabled:bg-brand-light-gray disabled:cursor-not-allowed disabled:text-brand-secondary"
                aria-label="Add to cart"
                disabled={isOutOfStock}
            >
                 {isOutOfStock ? <XIcon className="w-5 h-5"/> : <CartIcon className="w-5 h-5" />}
            </button>
        )}
       
        <div onClick={handleProductClick}>
             <LazyImage
              wrapperClassName="w-full aspect-square"
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
        </div>

        {isOutOfStock && (
            <div className="absolute inset-0 bg-brand-surface/70 flex items-center justify-center pointer-events-none">
                <span className="text-brand-text font-bold px-3 py-1 bg-brand-surface/80 rounded-full">Out of Stock</span>
            </div>
        )}
        
        {hasVariants && !isOutOfStock && showControls && (
            <div className="absolute inset-0 bg-black/60 p-4 flex flex-col justify-end text-white animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex flex-wrap gap-1 mb-2 justify-center">
                    {productVariants.map(variant => (
                        <button
                            key={variant.id}
                            onClick={(e) => handleVariantSelect(e, variant)}
                            disabled={variant.stock <= 0}
                            className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedVariant?.id === variant.id ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/50 hover:bg-white/20'}`}
                        >
                            {variant.name}
                        </button>
                    ))}
                </div>
                {selectedVariant && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-md bg-white text-black">
                            <button onClick={(e) => handleQuantityChange(e, -1)} className="px-2 py-1"><MinusIcon className="w-4 h-4" /></button>
                            <span className="px-2 text-sm font-semibold">{quantity}</span>
                            <button onClick={(e) => handleQuantityChange(e, 1)} className="px-2 py-1"><PlusIcon className="w-4 h-4" /></button>
                        </div>
                        <button onClick={handleAddToCart} className="flex-1 bg-brand-green text-white text-sm font-semibold py-2 rounded-md hover:bg-opacity-90">
                            Add
                        </button>
                    </div>
                )}
                 {!selectedVariant && (
                    <button onClick={handleProductClick} className="w-full bg-white/20 text-white text-sm font-semibold py-2 rounded-md hover:bg-white/30">
                        Select Option
                    </button>
                 )}
            </div>
        )}

      </div>
      <div className="mt-4 text-center">
        <h3 className="text-lg font-serif text-brand-text hover:text-brand-green cursor-pointer" onClick={handleProductClick}>{product.name}</h3>
        <p className="mt-1 text-sm text-brand-secondary">
          <span className="text-brand-green font-bold">₹{currentPrice.toFixed(2)}{hasVariants && !selectedVariant ? '+' : ''}</span>
          {currentOldPrice != null && (
            <span className="ml-2 text-brand-secondary/70 line-through">₹{currentOldPrice.toFixed(2)}</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;