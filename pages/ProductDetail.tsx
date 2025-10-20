import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useCart } from '../contexts/CartContext';
import { allProducts as staticProducts } from '../constants';
import { MinusIcon, PlusIcon, CartIcon, ArrowRightIcon, PhoneIcon, MailIcon } from '../components/Icons';
import { db } from '../firebase';
import { Product, QnA, ProductVariant, Tag, ProductPageSettings, ActionButtonSettings } from '../types';
import { ProductDetailSkeleton } from '../components/Skeletons';
import LazyImage from '../components/LazyImage';

const ICONS: { [key: string]: React.FC<{ className?: string }> } = {
    cart: CartIcon,
    arrowRight: ArrowRightIcon,
    phone: PhoneIcon,
    mail: MailIcon
};

const ProductDetail: React.FC = () => {
    const { params, navigate } = useNavigation();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [product, setProduct] = useState<Product | null | undefined>(undefined);
    const [qna, setQna] = useState<QnA[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [pageSettings, setPageSettings] = useState<Partial<ProductPageSettings>>({});

    const productVariants = product?.variants ? Object.keys(product.variants).map(key => ({ id: key, ...product.variants![key] })) : [];
    const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
    const currentOldPrice = selectedVariant?.oldPrice ?? product?.oldPrice;
    const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
    const isOutOfStock = currentStock <= 0;

    useEffect(() => {
        const settingsRef = db.ref('site_settings/productPage');
        const listener = settingsRef.on('value', snapshot => {
            const data = snapshot.val();
            setPageSettings(data || {});
        });
        return () => settingsRef.off('value', listener);
    }, []);

    useEffect(() => {
        setProduct(undefined); // Set loading state
        setSelectedVariant(null);
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const firebaseProductsData = snapshot.val();
            const firebaseProducts: Product[] = firebaseProductsData 
              ? Object.keys(firebaseProductsData).map(key => ({...firebaseProductsData[key], id: key})) 
              : [];

            const combined = new Map<string | number, Product>();
            staticProducts.forEach(p => combined.set(p.id, p));
            firebaseProducts.forEach(p => combined.set(p.id, p));
            
            const foundProduct = Array.from(combined.values()).find(p => String(p.id) === String(params?.productId));
            setProduct(foundProduct || null);

            if (foundProduct?.images?.length) {
                setSelectedImage(foundProduct.images[0]);
            }
        });

        return () => productsRef.off('value', listener);
    }, [params]);

    useEffect(() => {
        if (product) {
            const qnaRef = db.ref(`qna/${product.id}`);
            const listener = qnaRef.on('value', snapshot => {
                const data = snapshot.val();
                const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
                setQna(list);
            });
            return () => qnaRef.off('value', listener);
        }
    }, [product]);

    if (product === undefined) {
         return <ProductDetailSkeleton />;
    }

    if (!product) {
        return (
            <section className="py-32 bg-brand-bg min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-serif font-bold text-brand-text">Product Not Found</h1>
                    <button
                        onClick={() => navigate('shop')}
                        className="mt-8 bg-brand-green text-white px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg"
                    >
                        Back to Shop
                    </button>
                </div>
            </section>
        );
    }
    
    const defaultShippingInfo = "<p>We offer complimentary shipping on all orders over $50. Orders are typically processed within 1-2 business days.</p><p>If you're not completely satisfied with your purchase, you can return it within 30 days for a full refund or exchange. Please visit our returns page for more details.</p>";

    const imageUrls = product?.images && Array.isArray(product.images) && product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1580856526562-1b5e8a1c91f0?q=80&w=400&auto=format&fit=crop'];
    const primaryImage = selectedImage || imageUrls[0];
    const tags = product.tags ? Object.values(product.tags) : [];

    const ActionButton: React.FC<{ settings: Partial<ActionButtonSettings>; defaultText: string; defaultAction: () => void; isPrimary: boolean; }> = ({ settings, defaultText, defaultAction, isPrimary }) => {
        const config: ActionButtonSettings = {
            enabled: settings.enabled ?? true,
            text: settings.text || defaultText,
            linkType: settings.linkType || 'default',
            link: settings.link || '',
            icon: settings.icon || 'none',
            style: settings.style || (isPrimary ? 'primary' : 'secondary'),
        };

        if (!config.enabled) return null;

        const handleAction = () => {
            if (isOutOfStock) return;
            switch(config.linkType) {
                case 'default':
                    defaultAction();
                    break;
                case 'internal':
                    navigate(config.link as any);
                    break;
                case 'external':
                    window.open(config.link, '_blank', 'rel=noopener,noreferrer');
                    break;
                case 'product':
                    navigate('product', { productId: config.link });
                    break;
                case 'category': {
                    const [categoryId, categoryName] = config.link.split(':');
                    navigate('shop', { categoryId, categoryName: categoryName || 'Category' });
                    break;
                }
                case 'phone':
                    window.location.href = `tel:${config.link}`;
                    break;
                case 'email':
                    window.location.href = `mailto:${config.link}`;
                    break;
            }
        };

        const IconComponent = config.icon && config.icon !== 'none' ? ICONS[config.icon] : null;
        
        const styleClasses = {
            primary: "w-full bg-brand-green text-white",
            secondary: "flex-1 bg-brand-text text-brand-surface",
        };

        const className = `${styleClasses[config.style]} px-8 py-3 rounded-full text-base font-medium hover:bg-opacity-90 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2`;

        return (
            <button onClick={handleAction} disabled={isOutOfStock} className={className}>
                {IconComponent && config.icon === 'cart' && <IconComponent className="w-5 h-5" />}
                <span>{config.text}</span>
                {IconComponent && config.icon !== 'cart' && <IconComponent className="w-5 h-5" />}
            </button>
        );
    };

    return (
        <section className="py-24 bg-brand-bg">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Product Image Gallery */}
                    <div>
                        <div className="bg-brand-light-gray/70 rounded-lg flex items-center justify-center p-8 mb-4 h-96 relative overflow-hidden">
                            <LazyImage wrapperClassName="w-full h-full" src={primaryImage} alt={product.name || 'Product Image'} className="max-w-full h-auto max-h-full object-contain" />
                             <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
                                {tags.map((tag, index) => (
                                    <span key={index} className="text-xs text-white px-2 py-1 rounded-full shadow" style={{ backgroundColor: (tag as Tag).color || '#6B7F73' }}>
                                        {(tag as Tag).text}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {imageUrls.map((img, index) => (
                                <button key={index} onClick={() => setSelectedImage(img)} className={`w-20 h-20 rounded-md overflow-hidden border-2 ${selectedImage === img ? 'border-brand-green' : 'border-transparent'}`}>
                                    <LazyImage wrapperClassName="w-full h-full" src={img} alt={`${product.name || 'Product'} thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Product Details */}
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-brand-text">{product.name || 'Untitled Product'}</h1>
                        <div className="mt-4 flex items-center space-x-3">
                            <p className="text-3xl text-brand-green font-bold">₹{currentPrice.toFixed(2)}</p>
                            {currentOldPrice && (
                                <p className="text-xl text-brand-secondary/70 line-through">₹{currentOldPrice.toFixed(2)}</p>
                            )}
                        </div>
                         <div className="mt-4">
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                {isOutOfStock ? 'Out of Stock' : (currentStock < 10 ? `Only ${currentStock} left!` : 'In Stock')}
                            </span>
                        </div>
                        <p className="mt-6 text-brand-secondary leading-relaxed">
                            {(product.description || 'No description available.').substring(0, 150)}{(product.description?.length || 0) > 150 ? '...' : ''}
                        </p>
                        
                        {productVariants.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-sm font-medium text-brand-text">Options</h3>
                                <fieldset className="mt-2">
                                    <legend className="sr-only">Choose an option</legend>
                                    <div className="flex flex-wrap gap-3">
                                        {productVariants.map(variant => (
                                            <label key={variant.id} className={`relative flex items-center justify-center rounded-md border py-3 px-3 text-sm font-medium uppercase hover:bg-brand-light-gray/50 focus:outline-none sm:flex-1 cursor-pointer ${selectedVariant?.id === variant.id ? 'bg-brand-green text-white border-brand-green' : 'bg-brand-surface text-brand-text border-brand-light-gray'} ${variant.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input type="radio" name="variant-option" value={variant.id} checked={selectedVariant?.id === variant.id} onChange={() => setSelectedVariant(variant)} className="sr-only" aria-labelledby={`variant-option-${variant.id}-label`} disabled={variant.stock <= 0} />
                                                <p id={`variant-option-${variant.id}-label`}>{variant.name}</p>
                                                {variant.stock <= 0 && <span className="absolute -inset-px rounded-md border-2 border-brand-light-gray pointer-events-none" aria-hidden="true"><svg className="absolute inset-0 w-full h-full text-brand-light-gray stroke-2" viewBox="0 0 100 100" preserveAspectRatio="none" stroke="currentColor"><line x1="0" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke"></line></svg></span>}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>
                        )}

                        <div className="mt-8 flex items-center space-x-6">
                            <div className="flex items-center border border-brand-light-gray rounded-full">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 text-brand-secondary hover:bg-brand-light-gray/50 rounded-l-full"><MinusIcon className="w-5 h-5"/></button>
                                <span className="px-6 py-2 font-bold text-lg">{quantity}</span>
                                <button onClick={() => setQuantity(q => Math.min(currentStock, q + 1))} className="p-3 text-brand-secondary hover:bg-brand-light-gray/50 rounded-r-full" disabled={isOutOfStock}><PlusIcon className="w-5 h-5"/></button>
                            </div>
                             <ActionButton settings={pageSettings.buttons?.addToCart || {}} defaultText="Add to Cart" defaultAction={() => addToCart(product, quantity, selectedVariant || undefined)} isPrimary={false} />
                        </div>
                       
                        <div className="mt-4">
                            <ActionButton settings={pageSettings.buttons?.buyNow || {}} defaultText="Buy Now" defaultAction={() => { addToCart(product, quantity, selectedVariant || undefined); navigate('cart'); }} isPrimary={true} />
                        </div>
                    </div>
                </div>

                {/* Description Tabs */}
                <div className="mt-20">
                    <div className="border-b border-brand-light-gray">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('description')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'description' ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-brand-light-gray'}`}>
                                Description
                            </button>
                             <button onClick={() => setActiveTab('qna')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'qna' ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-brand-light-gray'}`}>
                                Q&A ({qna.length})
                            </button>
                            <button onClick={() => setActiveTab('shipping')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'shipping' ? 'border-brand-green text-brand-green' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-brand-light-gray'}`}>
                                Shipping & Returns
                            </button>
                        </nav>
                    </div>
                    <div className="mt-8">
                        {activeTab === 'description' && (
                            <div className="prose max-w-none text-brand-secondary" dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }}>
                            </div>
                        )}
                        {activeTab === 'qna' && (
                            <div className="prose max-w-none text-brand-secondary space-y-6">
                                {qna.length > 0 ? qna.map(item => (
                                    <div key={item.id}>
                                        <h4 className="font-bold text-brand-text">Q: {item.question}</h4>
                                        <p>A: {item.answer}</p>
                                    </div>
                                )) : <p>No questions have been answered for this product yet.</p>}
                            </div>
                        )}
                         {activeTab === 'shipping' && (
                            <div className="prose max-w-none text-brand-secondary" dangerouslySetInnerHTML={{ __html: pageSettings.shippingReturnsInfo || defaultShippingInfo }}>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductDetail;