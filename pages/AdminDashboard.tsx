import React, { useEffect, useState, FC, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { db } from '../firebase';
import { Product, User, Category, HeroSettings, SubCategory, SocialLink, ContactInfo, PosterSlide, OfferSectionSettings, ImageScrollerSettings, QnA, Tag, ProductVariant, HighlightedNoteSettings, FooterSettings, NavLink, FooterColumn, ActionButtonSettings, ProductPageSettings, Author, TestimonialsSettings, Theme, DiwaliThemeSettings, ThemeColors, ColorSet, DiwaliOverlaySetting, DecorativeOverlay, FloatingDecoration, HeaderOverlapImageSettings, ShopPageSettings, BottomBlendSettings, BestsellerListSettings, CategoryCardSettings, ProductShowcaseSettings, EmbedScrollerSettings, EmbedSlide, SocialLoginSettings, AnnouncementBarSettings, StructuredDescriptionItem, ProductOffer, HeroImageStyles } from '../types';
import { allProducts as staticProducts, initialCategories } from '../constants';
import { XIcon, TrashIcon, PlusIcon, ArrowRightIcon, ChevronDownIcon, PhoneIcon, MailIcon, CartIcon, SparkleIcon, StarIcon, LeafIcon } from '../components/Icons';

// --- HELPER FUNCTIONS ---
const isObject = (item: any): item is object => item && typeof item === 'object' && !Array.isArray(item);

const mergeDeep = (target: any, ...sources: any[]): any => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return mergeDeep(target, ...sources);
};


// --- Helper for File Upload ---
const uploadFile = async (file: File): Promise<string> => {
    const apiKey = '5fd2a4346ac2e5485a916a5d734d508b';
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image upload failed: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        if (result.success && result.data && result.data.url) {
            return result.data.url;
        } else {
            throw new Error(result.error?.message || 'Image upload failed due to an unknown error.');
        }
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        throw error;
    }
};

const saveImageUrlToGallery = async (url: string): Promise<void> => {
    if (!url || !url.startsWith('http')) return;
    try {
        const newImageRef = db.ref('uploaded_images').push();
        await newImageRef.set({
            url: url,
            uploadedAt: window.firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error("Failed to save image URL to gallery", error);
    }
};

const uploadAndSaveFile = async (file: File): Promise<string> => {
    const url = await uploadFile(file);
    if (url) {
        await saveImageUrlToGallery(url);
    }
    return url;
};


// --- Reusable UI Components ---
const ConfirmationModal: FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <div className="mt-4 flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const CollapsibleSection: FC<{ title: string, children: React.ReactNode, startsOpen?: boolean }> = ({ title, children, startsOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startsOpen);
    return (
        <div className="bg-white rounded-lg shadow-md">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-bold text-xl"
            >
                {title}
                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-6 pt-0 animate-fade-in-up">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- Product Management Components ---
const AddEditProductModal: FC<{ isOpen: boolean, onClose: () => void, productToEdit: Product | null, categories: Category[], allProducts: Product[], openImagePicker: (callback: (url: string) => void) => void }> = ({ isOpen, onClose, productToEdit, categories, allProducts, openImagePicker }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [qna, setQna] = useState<QnA[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [newImageUrl, setNewImageUrl] = useState('');

    // States for sub-forms (tags, variants, qna)
    const [tagInput, setTagInput] = useState({ text: '', color: '#6B7F73' });
    const [variantInput, setVariantInput] = useState<Omit<ProductVariant, 'id'>>({ name: '', price: 0, oldPrice: 0, stock: 10, image: '' });
    const [qnaInput, setQnaInput] = useState({ question: '', answer: '' });
    const [descItemInput, setDescItemInput] = useState({ title: '', content: '' });


    useEffect(() => {
        if (productToEdit) {
            setFormData(productToEdit);
            setImageUrls(productToEdit.images || []);
            // Fetch QnA for this product
            const qnaRef = db.ref(`qna/${productToEdit.id}`);
            qnaRef.once('value', snapshot => {
                const data = snapshot.val();
                setQna(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
            });
        } else {
            setFormData({ name: '', price: 0, stock: 10, category: categories[0]?.name || '', subcategory: '', description: '', images: [], tags: {}, variants: {}, isPopular: false, isVisible: true, hasCustomOverlay: false, recommendations: {}, structuredDescription: {}, offer: { enabled: false, title: '', highlightColor: '#EF4444', textColor: '#FFFFFF' } });
            setImageUrls([]);
            setQna([]);
        }
    }, [productToEdit, isOpen, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;
        
        const newFormData = {...formData, [name]: isCheckbox ? checkedValue : value};

        if (name === 'category') newFormData.subcategory = '';

        setFormData(newFormData);
    };
    
    const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;
        const isNumber = type === 'number';

        setFormData(p => ({
            ...p,
            offer: {
                ...(p.offer as ProductOffer),
                [name]: isCheckbox ? checkedValue : (isNumber ? Number(value) : value),
            }
        }));
    };

    const addImageUrl = () => {
        if (newImageUrl && !imageUrls.includes(newImageUrl)) {
            setImageUrls(prev => [newImageUrl, ...prev]);
            setNewImageUrl('');
        }
    };
    
    const removeImageUrl = (url: string) => {
        setImageUrls(prev => prev.filter(u => u !== url));
    };

    const handleSubFormAdd = (type: 'tags' | 'variants' | 'qna' | 'structuredDescription') => {
        const newId = db.ref().push().key!;
        if (type === 'tags' && tagInput.text) {
            setFormData(p => ({ ...p, tags: { ...p.tags, [newId]: tagInput } }));
            setTagInput({ text: '', color: '#6B7F73' });
        }
        if (type === 'variants' && variantInput.name) {
             setFormData(p => ({ ...p, variants: { ...p.variants, [newId]: variantInput } }));
             setVariantInput({ name: '', price: 0, oldPrice: 0, stock: 10, image: '' });
        }
        if (type === 'qna' && qnaInput.question && qnaInput.answer) {
            setQna(prev => [...prev, { ...qnaInput, id: newId }]);
            setQnaInput({ question: '', answer: '' });
        }
        if (type === 'structuredDescription' && descItemInput.title && descItemInput.content) {
            setFormData(p => ({ ...p, structuredDescription: { ...p.structuredDescription, [newId]: descItemInput }}));
            setDescItemInput({ title: '', content: '' });
        }
    };

    const handleSubFormRemove = (type: 'tags' | 'variants' | 'qna' | 'structuredDescription', id: string) => {
        if (type === 'tags') {
            const newTags = { ...formData.tags };
            delete newTags[id];
            setFormData(p => ({ ...p, tags: newTags }));
        }
        if (type === 'variants') {
             const newVariants = { ...formData.variants };
            delete newVariants[id];
            setFormData(p => ({ ...p, variants: newVariants }));
        }
        if (type === 'qna') {
            setQna(prev => prev.filter(item => item.id !== id));
        }
        if (type === 'structuredDescription') {
            const newDesc = { ...formData.structuredDescription };
            delete newDesc[id];
            setFormData(p => ({...p, structuredDescription: newDesc}));
        }
    };
    
    const handleRecommendationToggle = (type: 'product' | 'category', id: string) => {
        const path = type === 'product' ? 'relatedProductIds' : 'relatedCategoryIds';
        const currentIds = formData.recommendations?.[path] || {};
        const newIds = { ...currentIds };
        if (newIds[id]) delete newIds[id]; else newIds[id] = true;
        setFormData(p => ({
            ...p,
            recommendations: {
                ...(p.recommendations || {}),
                [path]: newIds
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || formData.price == null || imageUrls.length === 0 || !formData.category) return alert("Product name, price, category, and at least one image are required.");
        
        setLoading(true);
        const productData = { ...formData, images: imageUrls, price: Number(formData.price), oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null, isPopular: !!formData.isPopular, isVisible: formData.isVisible !== false, stock: Number(formData.stock || 0) };
        
        try {
            let productId = productToEdit?.id;
            if (productId) {
                await db.ref(`products/${productId}`).set(productData);
            } else {
                const newProductRef = db.ref('products').push();
                await newProductRef.set({ ...productData, id: newProductRef.key });
                productId = newProductRef.key;
            }

            // Save QnA data
            const qnaForDb = qna.reduce((acc, item) => {
                acc[item.id] = { question: item.question, answer: item.answer };
                return acc;
            }, {} as any);
            await db.ref(`qna/${productId}`).set(qnaForDb);

            onClose();
        } catch (error) { alert("Error: Could not save product. See console for details."); } 
        finally { setLoading(false); }
    };
    
    if (!isOpen) return null;

    const availableSubcategories = categories.find(c => c.name === formData.category)?.subcategories || [];
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 animate-fade-in-up">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center"><h3 className="text-xl font-bold">{productToEdit ? 'Edit Product' : 'Add New Product'}</h3><button type="button" onClick={onClose}><XIcon className="w-6 h-6"/></button></div>
                    <input name="name" type="text" placeholder="Product Name" value={formData.name || ''} onChange={handleChange} className={inputStyle}/>
                    <div className="p-4 border rounded-lg space-y-2"> {/* Images */}
                        <label className="block text-sm font-medium text-gray-700">Images</label>
                        <div className="flex items-center space-x-2">
                           <input type="text" placeholder="Paste Image URL" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} className={`${inputStyle} flex-grow`}/>
                           <button type="button" onClick={addImageUrl} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add URL</button>
                           <button type="button" onClick={() => openImagePicker(url => setImageUrls(prev => [url, ...prev]))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">{imageUrls.map((url, i) => (<div key={i} className="relative"><img src={url} className="w-20 h-20 object-cover rounded"/><button type="button" onClick={() => removeImageUrl(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button></div>))}</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Structured Description (Accordion on Product Page)</label>
                        {formData.structuredDescription && Object.entries(formData.structuredDescription).map(([id, item]: [string, any]) => (
                            <div key={id} className="border-b pb-2">
                                <input type="text" value={item.title} onChange={(e) => setFormData(p => ({...p, structuredDescription: {...p.structuredDescription, [id]: {...item, title: e.target.value}} }))} className={`${inputStyle} font-semibold mb-1`} />
                                <textarea value={item.content} onChange={(e) => setFormData(p => ({...p, structuredDescription: {...p.structuredDescription, [id]: {...item, content: e.target.value}} }))} className={inputStyle} rows={3} />
                                <button type="button" onClick={() => handleSubFormRemove('structuredDescription', id)} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
                            </div>
                        ))}
                         <div className="flex items-end gap-2 pt-2">
                            <div className="flex-1"><input type="text" placeholder="Title (e.g., Key Ingredients)" value={descItemInput.title} onChange={e => setDescItemInput(p=>({...p, title: e.target.value}))} className={inputStyle}/></div>
                            <div className="flex-1"><textarea placeholder="Content (HTML supported)" value={descItemInput.content} onChange={e => setDescItemInput(p=>({...p, content: e.target.value}))} className={inputStyle} rows={1}/></div>
                            <button type="button" onClick={() => handleSubFormAdd('structuredDescription')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 h-10">Add</button>
                        </div>
                    </div>
                    <textarea name="description" placeholder="Fallback Description (for old systems, optional)" value={formData.description || ''} onChange={handleChange} className={inputStyle} rows={2}/>

                    <div className="grid grid-cols-3 gap-4">
                        <input name="price" type="number" step="0.01" placeholder="Price" value={formData.price ?? ''} onChange={handleChange} className={inputStyle}/>
                        <input name="oldPrice" type="number" step="0.01" placeholder="Old Price (Optional)" value={formData.oldPrice || ''} onChange={handleChange} className={inputStyle}/>
                        <input name="stock" type="number" placeholder="Stock Quantity" value={formData.stock ?? ''} onChange={handleChange} className={inputStyle}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="category" value={formData.category || ''} onChange={handleChange} className={inputStyle}><option value="" disabled>Select a category</option>{categories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}</select>
                         {availableSubcategories.length > 0 && (<select name="subcategory" value={formData.subcategory || ''} onChange={handleChange} className={inputStyle}><option value="">Select subcategory (optional)</option>{availableSubcategories.map(sub => (<option key={sub.id} value={sub.name}>{sub.name}</option>))}</select>)}
                    </div>

                    <div className="p-4 border rounded-lg space-y-3"> {/* Product Offer */}
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" name="enabled" checked={formData.offer?.enabled || false} onChange={handleOfferChange} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                            <span className="text-sm font-medium text-gray-700">Enable Offer for this Product</span>
                        </label>
                        {formData.offer?.enabled && (
                            <div className="space-y-3 animate-fade-in-up">
                                <input name="title" type="text" placeholder="Offer Title (e.g., '20% OFF!')" value={formData.offer.title || ''} onChange={handleOfferChange} className={inputStyle}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="discountPercentage" type="number" placeholder="Discount %" value={formData.offer.discountPercentage || ''} onChange={handleOfferChange} className={inputStyle} disabled={!!formData.offer.discountAmount} />
                                    <input name="discountAmount" type="number" placeholder="Discount Amount (₹)" value={formData.offer.discountAmount || ''} onChange={handleOfferChange} className={inputStyle} disabled={!!formData.offer.discountPercentage} />
                                </div>
                                <div>
                                    <label className="text-xs">Countdown End Date (Optional)</label>
                                    <input name="endDate" type="datetime-local" value={formData.offer.endDate || ''} onChange={handleOfferChange} className={inputStyle}/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs">Badge Color</label><input name="highlightColor" type="color" value={formData.offer.highlightColor || '#EF4444'} onChange={handleOfferChange} className={`${inputStyle} h-10 p-1`}/></div>
                                    <div><label className="text-xs">Badge Text Color</label><input name="textColor" type="color" value={formData.offer.textColor || '#FFFFFF'} onChange={handleOfferChange} className={`${inputStyle} h-10 p-1`}/></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <CollapsibleSection title="Extra Media">
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Video URL</label>
                                <input name="videoUrl" type="text" placeholder="e.g., YouTube, Vimeo, or direct .mp4 link" value={formData.videoUrl || ''} onChange={handleChange} className={inputStyle}/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Social Media Post URL</label>
                                <input name="socialMediaLink" type="text" placeholder="e.g., Instagram Post Link" value={formData.socialMediaLink || ''} onChange={handleChange} className={inputStyle}/>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <div className="p-4 border rounded-lg space-y-3"> {/* Tags */}
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <div className="flex items-center space-x-2"><input type="text" placeholder="Tag Text" value={tagInput.text} onChange={e => setTagInput(p=>({...p, text: e.target.value}))} className={inputStyle} /><input type="color" value={tagInput.color} onChange={e => setTagInput(p=>({...p, color: e.target.value}))} className={`${inputStyle} h-10 p-1 w-16 cursor-pointer`} /><button type="button" onClick={() => handleSubFormAdd('tags')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add</button></div>
                        <div className="flex flex-wrap gap-2">{formData.tags && Object.entries(formData.tags).map(([id, tag]: [string, any]) => (<div key={id} className="text-white text-sm font-medium pl-3 pr-2 py-1 rounded-full flex items-center" style={{backgroundColor: tag.color}}>{tag.text}<button type="button" onClick={() => handleSubFormRemove('tags', id)} className="ml-2 text-white/70 hover:text-white"><XIcon className="w-3 h-3"/></button></div>))}</div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3"> {/* Variants */}
                        <label className="block text-sm font-medium text-gray-700">Variants (Optional)</label>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto] gap-2 items-end"><input type="text" placeholder="Name (e.g., 50ml)" value={variantInput.name} onChange={e => setVariantInput(p=>({...p, name: e.target.value}))} className={inputStyle}/><input type="number" placeholder="Price" value={variantInput.price} onChange={e => setVariantInput(p=>({...p, price: Number(e.target.value)}))} className={inputStyle}/><input type="number" placeholder="Old Price" value={variantInput.oldPrice} onChange={e => setVariantInput(p=>({...p, oldPrice: Number(e.target.value)}))} className={inputStyle}/><input type="number" placeholder="Stock" value={variantInput.stock} onChange={e => setVariantInput(p=>({...p, stock: Number(e.target.value)}))} className={inputStyle}/>
                           <div className="flex"><input type="text" placeholder="Image URL" value={variantInput.image} onChange={e => setVariantInput(p=>({...p, image: e.target.value}))} className={`${inputStyle} rounded-r-none`} /><button type="button" onClick={() => openImagePicker((url) => setVariantInput(p=>({...p, image: url})))} className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-sm">...</button></div>
                        <button type="button" onClick={() => handleSubFormAdd('variants')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 h-10">Add</button></div>
                        <div className="space-y-1">{formData.variants && Object.entries(formData.variants).map(([id, v]: [string, any]) => (<div key={id} className="flex items-center gap-2 text-sm p-1 bg-gray-50 rounded"><img src={v.image || 'https://via.placeholder.com/40'} alt="" className="w-8 h-8 object-cover rounded" /><span className="font-semibold w-1/4">{v.name}</span><span className="w-1/4">₹{v.price}</span><span className="w-1/4">Stock: {v.stock}</span>
                        <input type="text" readOnly value={v.image || ''} className="text-xs p-1 bg-white border rounded w-1/4" /><button type="button" onClick={() => navigator.clipboard.writeText(v.image)} className="text-xs p-1 bg-gray-200 rounded">Copy</button>
                        <button type="button" onClick={() => handleSubFormRemove('variants', id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button></div>))}</div>
                    </div>
                     <div className="p-4 border rounded-lg space-y-3"> {/* Q&A */}
                        <label className="block text-sm font-medium text-gray-700">Questions & Answers</label>
                        {qna.map((item, index) => (<div key={item.id} className="text-sm border-b pb-2"><p><strong className="font-semibold">Q:</strong> {item.question}</p><p><strong className="font-semibold">A:</strong> {item.answer}</p><button type="button" onClick={() => handleSubFormRemove('qna', item.id)} className="text-xs text-red-500 hover:underline">Remove</button></div>))}
                        <input type="text" placeholder="Question" value={qnaInput.question} onChange={e => setQnaInput(p=>({...p, question: e.target.value}))} className={inputStyle}/>
                        <textarea placeholder="Answer" value={qnaInput.answer} onChange={e => setQnaInput(p=>({...p, answer: e.target.value}))} className={inputStyle} rows={2}/>
                        <button type="button" onClick={() => handleSubFormAdd('qna')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm">Add Q&A</button>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Recommendations ("You Might Also Like")</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-1">Select Products</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md">
                                    {allProducts.filter(p => p.id !== productToEdit?.id).map(p => (
                                        <label key={p.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer text-sm">
                                            <input type="checkbox" checked={!!formData.recommendations?.relatedProductIds?.[String(p.id)]} onChange={() => handleRecommendationToggle('product', String(p.id))} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green"/>
                                            <span>{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Select Categories</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md">
                                    {categories.map(c => (
                                        <label key={c.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer text-sm">
                                            <input type="checkbox" checked={!!formData.recommendations?.relatedCategoryIds?.[String(c.id)]} onChange={() => handleRecommendationToggle('category', String(c.id))} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green"/>
                                            <span>{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center"><input id="isPopular" name="isPopular" type="checkbox" checked={formData.isPopular || false} onChange={handleChange} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green" /><label htmlFor="isPopular" className="ml-2 block text-sm text-gray-900">Mark as Popular Product</label></div>
                        <div className="flex items-center"><input id="isVisible" name="isVisible" type="checkbox" checked={formData.isVisible !== false} onChange={handleChange} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green" /><label htmlFor="isVisible" className="ml-2 block text-sm text-gray-900">Product is Visible</label></div>
                        <div className="flex items-center"><input id="hasCustomOverlay" name="hasCustomOverlay" type="checkbox" checked={formData.hasCustomOverlay || false} onChange={handleChange} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green" /><label htmlFor="hasCustomOverlay" className="ml-2 block text-sm text-gray-900">Apply Card Overlay</label></div>
                    </div>
                    <div className="flex justify-end"><button type="submit" disabled={loading} className="bg-brand-green text-white px-6 py-2 rounded-full font-medium">{loading ? 'Saving...' : 'Save Product'}</button></div>
                </form>
            </div>
        </div>
    );
};

const ProductsManager: FC<{ openImagePicker: (callback: (url: string) => void) => void }> = ({ openImagePicker }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [productsToImport, setProductsToImport] = useState<Product[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const productsRef = db.ref('products');
        const listener = productsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const productsList: Product[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setProducts(productsList);
        });
        return () => productsRef.off('value', listener);
    }, []);

    useEffect(() => {
        const categoriesRef = db.ref('categories');
        const listener = categoriesRef.on('value', snapshot => {
            const data = snapshot.val();
            const categoriesList = data ? Object.keys(data).map(key => ({ id: key, ...data[key], subcategories: data[key].subcategories ? Object.values(data[key].subcategories) : [] })) : [];
            setCategories(categoriesList);
        });
        return () => categoriesRef.off('value', listener);
    }, []);

    const openEditModal = (product: Product) => { setProductToEdit(product); setIsModalOpen(true); };
    const openAddModal = () => { setProductToEdit(null); setIsModalOpen(true); };
    const openDeleteModal = (product: Product) => { setProductToDelete(product); setIsDeleteModalOpen(true); };
    
    const handleDelete = async () => {
        if (!productToDelete) return;
        await db.ref(`products/${productToDelete.id}`).remove();
        await db.ref(`qna/${productToDelete.id}`).remove();
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    };

    const handleToggle = async (product: Product, field: 'isPopular' | 'isVisible') => {
        if (!product || typeof product.id === 'undefined') return;
        const currentValue = field === 'isVisible' ? product.isVisible !== false : !!product.isPopular;
        try { await db.ref(`products/${product.id}/${field}`).set(!currentValue); } 
        catch (error) { alert("Failed to update status."); }
    };
    
    const handleExportProducts = () => {
        const dataStr = JSON.stringify(products, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'aurashka_products.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    const parsedProducts = JSON.parse(content as string);
                    if (Array.isArray(parsedProducts)) {
                        setProductsToImport(parsedProducts);
                        setIsImportModalOpen(true);
                    } else {
                        alert('Invalid JSON file format. Expected an array of products.');
                    }
                } catch (error) {
                    alert('Error parsing JSON file.');
                }
            };
            reader.readAsText(file);
        }
        // Reset file input
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const confirmImport = async () => {
        if (!productsToImport) return;
        const updates: { [key: string]: any } = {};
        productsToImport.forEach(product => {
            const productId = product.id || db.ref('products').push().key;
            if (productId) {
                updates[`/products/${productId}`] = { ...product, id: productId };
            }
        });

        try {
            await db.ref().update(updates);
            alert(`${productsToImport.length} products imported successfully.`);
        } catch (error) {
            console.error(error);
            alert('An error occurred during import.');
        } finally {
            setIsImportModalOpen(false);
            setProductsToImport(null);
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-serif font-bold text-brand-dark">Products ({products.length})</h1>
                <div className="flex gap-2">
                     <input type="file" ref={fileInputRef} onChange={handleImportFileSelect} accept=".json" className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-600">Import JSON</button>
                    <button onClick={handleExportProducts} className="bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800">Export JSON</button>
                    <button onClick={openAddModal} className="bg-brand-green text-white px-5 py-2 rounded-full font-medium hover:bg-opacity-90 flex items-center space-x-2 shadow-sm transition-transform hover:scale-105"><PlusIcon className="w-5 h-5"/><span>Add New Product</span></button>
                </div>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th><th scope="col" className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visible</th><th scope="col" className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Popular</th><th scope="col" className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{products.map(product => (<tr key={product.id} className={`${product.isVisible === false ? 'bg-gray-50 opacity-60' : ''}`}><td className="py-4 px-6"><img src={product.images?.[0]} alt={product.name} className="w-12 h-12 object-cover rounded-md"/></td><td className="py-4 px-6 font-medium whitespace-nowrap text-gray-900">{product.name}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">₹{(product.price).toFixed(2)}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">{product.stock}</td><td className="py-4 px-6 text-center"><label htmlFor={`visible-toggle-${product.id}`} className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id={`visible-toggle-${product.id}`} className="sr-only peer" checked={product.isVisible !== false} onChange={() => handleToggle(product, 'isVisible')} /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div></label></td><td className="py-4 px-6 text-center"><label htmlFor={`popular-toggle-${product.id}`} className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id={`popular-toggle-${product.id}`} className="sr-only peer" checked={!!product.isPopular} onChange={() => handleToggle(product, 'isPopular')} /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div></label></td><td className="py-4 px-6 space-x-2 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => openEditModal(product)} className="text-brand-green hover:text-brand-dark">Edit</button><button onClick={() => openDeleteModal(product)} className="text-red-600 hover:text-red-800">Delete</button></td></tr>))}</tbody></table></div>
            <AddEditProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} productToEdit={productToEdit} categories={categories} allProducts={products} openImagePicker={openImagePicker} />
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`} />
            <ConfirmationModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={confirmImport} title="Confirm Product Import" message={`You are about to import ${productsToImport?.length || 0} products. This will add new products and overwrite existing products with the same ID. This action cannot be undone.`} />
        </div>
    );
};


// --- User Management Components ---
const UsersManager: FC = () => {
    const [users, setUsers] = useState<(User & { id: string })[]>([]);
    const [userToDelete, setUserToDelete] = useState<(User & { id: string }) | null>(null);

    useEffect(() => {
        const usersRef = db.ref('users');
        const listener = usersRef.on('value', snapshot => {
            const data = snapshot.val();
            const userList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setUsers(userList);
        });
        return () => usersRef.off('value', listener);
    }, []);

    const handleDelete = async () => {
        if (!userToDelete) return;
        await db.ref(`users/${userToDelete.id}`).remove();
        setUserToDelete(null);
    };

    return (
        <div>
            <h1 className="text-3xl font-serif font-bold text-brand-dark mb-6">Users ({users.length})</h1>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th><th scope="col" className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{users.map(user => (<tr key={user.id}><td className="py-4 px-6 font-medium whitespace-nowrap text-gray-900">{user.name}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">{user.email}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">{user.phone}</td><td className="py-4 px-6 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-800">Delete</button></td></tr>))}</tbody></table></div>
            <ConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDelete} title="Delete User" message={`Are you sure you want to delete user "${userToDelete?.name}"?`} />
        </div>
    );
};

// --- Category Management Components ---
const AddEditCategoryModal: FC<{ isOpen: boolean, onClose: () => void, categoryToEdit: Category | null, openImagePicker: (callback: (url: string) => void) => void }> = ({ isOpen, onClose, categoryToEdit, openImagePicker }) => {
    const [formData, setFormData] = useState<Partial<Category>>({ name: '', image: '', subcategories: [] });
    const [loading, setLoading] = useState(false);
    const [subcatInput, setSubcatInput] = useState('');

    useEffect(() => {
        setFormData(categoryToEdit || { name: '', image: '', subcategories: [] });
    }, [categoryToEdit, isOpen]);

    const handleAddSubcategory = () => {
        if (subcatInput.trim() === '') return;
        const newSub: SubCategory = { id: db.ref().push().key!, name: subcatInput.trim() };
        setFormData(prev => ({...prev, subcategories: [...(prev.subcategories || []), newSub]}));
        setSubcatInput('');
    };
    const handleRemoveSubcategory = (idToRemove: string) => {
        setFormData(prev => ({...prev, subcategories: prev.subcategories?.filter(s => s.id !== idToRemove)}));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.image) return alert('Category name and image are required.');
        setLoading(true);
        const subcategoriesAsObject = (formData.subcategories || []).reduce((acc, sub) => {
            acc[sub.id] = { name: sub.name }; return acc;
        }, {} as any);
        const categoryData = { name: formData.name, image: formData.image, subcategories: subcategoriesAsObject };
        try {
            if (categoryToEdit) await db.ref(`categories/${categoryToEdit.id}`).update(categoryData);
            else await db.ref('categories').push(categoryData);
            onClose();
        } catch (error) { console.error("Failed to save category", error); } finally { setLoading(false); }
    };

    if (!isOpen) return null;
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 animate-fade-in-up">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-xl font-bold">{categoryToEdit ? 'Edit Category' : 'Add Category'}</h3><button type="button" onClick={onClose}><XIcon className="w-6 h-6"/></button></div>
                <div className="text-center">
                    <img src={formData.image || 'https://via.placeholder.com/128'} alt="Category preview" className="w-32 h-32 object-cover rounded-full mx-auto mb-2 border" />
                    <button type="button" onClick={() => openImagePicker((url) => setFormData(p => ({...p, image: url})))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">Browse Images</button>
                    <button type="button" onClick={()=>setFormData(p=>({...p, image: ''}))} className="text-xs text-red-500 hover:underline mt-1 ml-2">Remove Image</button>
                </div>
                <input type="text" placeholder="Category Name" value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputStyle}/>
                <input type="text" placeholder="Or paste Image URL" value={formData.image || ''} onChange={e => setFormData(p => ({ ...p, image: e.target.value }))} className={inputStyle}/>
                <div className="p-4 border rounded-lg space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Subcategories</label>
                    <div className="flex items-center space-x-2"><input type="text" placeholder="New subcategory name" value={subcatInput} onChange={e => setSubcatInput(e.target.value)} className={inputStyle}/><button type="button" onClick={handleAddSubcategory} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add</button></div>
                    <div className="flex flex-wrap gap-2">{formData.subcategories?.map(sub => (<div key={sub.id} className="bg-gray-100 text-gray-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full flex items-center">{sub.name}<button type="button" onClick={() => handleRemoveSubcategory(sub.id)} className="ml-2 text-gray-500 hover:text-red-500"><XIcon className="w-3 h-3"/></button></div>))}</div>
                </div>
                <div className="flex justify-end"><button type="submit" disabled={loading} className="bg-brand-green text-white px-6 py-2 rounded-full font-medium">{loading ? 'Saving...' : 'Save'}</button></div>
            </form>
        </div>
    );
};

const CategoriesManager: FC<{ openImagePicker: (callback: (url: string) => void) => void }> = ({ openImagePicker }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const categoriesRef = db.ref('categories');
        const listener = categoriesRef.on('value', snapshot => {
            const data = snapshot.val();
            const categoriesList = data ? Object.keys(data).map(key => ({ id: key, ...data[key], subcategories: data[key].subcategories ? Object.values(data[key].subcategories) : [] })) : initialCategories;
            setCategories(categoriesList);
        });
        return () => categoriesRef.off('value', listener);
    }, []);

    const openEditModal = (cat: Category) => { setCategoryToEdit(cat); setIsModalOpen(true); };
    const openAddModal = () => { setCategoryToEdit(null); setIsModalOpen(true); };
    const handleDelete = async () => { if (categoryToDelete) { await db.ref(`categories/${categoryToDelete.id}`).remove(); setCategoryToDelete(null); }};
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-serif font-bold text-brand-dark">Categories ({categories.length})</h1><button onClick={openAddModal} className="bg-brand-green text-white px-5 py-2 rounded-full font-medium hover:bg-opacity-90 flex items-center space-x-2 shadow-sm transition-transform hover:scale-105"><PlusIcon className="w-5 h-5"/><span>Add New Category</span></button></div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Image</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Subcategories</th><th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{categories.map(cat => (<tr key={cat.id}><td className="py-4 px-6"><img src={cat.image} alt={cat.name} className="w-12 h-12 object-cover rounded-md"/></td><td className="py-4 px-6 font-medium whitespace-nowrap text-gray-900">{cat.name}</td><td className="py-4 px-6 text-xs text-gray-500">{(cat.subcategories || []).map(s => s.name).join(', ')}</td><td className="py-4 px-6 space-x-2 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => openEditModal(cat)} className="text-brand-green hover:text-brand-dark">Edit</button><button onClick={() => setCategoryToDelete(cat)} className="text-red-600 hover:text-red-800">Delete</button></td></tr>))}</tbody></table></div>
            <AddEditCategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categoryToEdit={categoryToEdit} openImagePicker={openImagePicker} />
            <ConfirmationModal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${categoryToDelete?.name}"?`} />
        </div>
    );
};


// --- Homepage Settings Component ---
const HeroPreview: FC<{ settings: Partial<HeroSettings>, previewMode: 'desktop' | 'mobile' | 'tablet' }> = ({ settings, previewMode }) => {
    if (!settings) return null;

    const styles: Partial<HeroImageStyles> = 
        (previewMode === 'desktop' ? settings.imageStyles?.desktop : 
        previewMode === 'tablet' ? settings.imageStyles?.tablet :
        settings.imageStyles?.mobile) || {};

    const zoom = styles.zoom || 100;
    const focusX = styles.focusX ?? 50;
    const focusY = styles.focusY ?? 50;
    const focus = `${focusX}% ${focusY}%`;

    const imageStyle: React.CSSProperties = {
        transform: `scale(${zoom / 100})`,
        objectPosition: focus,
        transition: 'transform 0.3s ease-out, object-position 0.3s ease-out',
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    };
    
    const containerClasses = `relative flex items-center rounded-md overflow-hidden bg-gray-200 transition-all duration-300 ease-in-out ${
        previewMode === 'mobile' ? 'w-[250px] h-[445px] mx-auto border-8 border-gray-800 rounded-[2rem]' : 
        previewMode === 'tablet' ? 'w-[400px] h-[533px] mx-auto border-8 border-gray-800 rounded-[2rem]' : 
        'w-full min-h-[250px]'
    }`;

    const contentScale = previewMode === 'desktop' ? 'scale-75' : 'scale-50';

    return (
        <div className="mt-4 border p-4 rounded-lg relative">
            <h3 className="text-sm font-semibold mb-2">Live Preview</h3>
            <div className={containerClasses}>
                {settings.image && <img src={settings.image} alt="preview" style={imageStyle} />}
                <div className="absolute inset-0" style={{ backgroundColor: settings.overlayColor || 'rgba(255, 255, 255, 0.5)' }}></div>
                <div className={`relative max-w-xl mx-auto px-4 w-full ${contentScale} origin-left`}>
                    <p className="font-script text-brand-green" style={{ fontSize: `${settings.fontSizes?.preheadline || 24}px` }}>{settings.preheadline || 'Pre-headline'}</p>
                    <h1 className="mt-1 font-extrabold font-serif text-brand-dark tracking-tight" style={{ fontSize: `${settings.fontSizes?.headline || 48}px`, lineHeight: 1.1 }}>{settings.headline || 'Headline'}</h1>
                    <p className="mt-3 text-sm text-gray-600" style={{ fontSize: `${settings.fontSizes?.subheadline || 16}px` }}>{settings.subheadline || 'Sub-headline text will go here.'}</p>
                    {settings.buttonLinkType !== 'none' && (
                        <div className="mt-4">
                            <button type="button" className="group inline-flex items-center bg-brand-green text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                                {settings.buttonText || 'Button Text'}
                                <ArrowRightIcon className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EmbedScrollerPreview: FC<{ section: EmbedScrollerSettings }> = ({ section }) => {
    const slides = useMemo(() => section.slides ? (Object.values(section.slides) as Omit<EmbedSlide, 'id'>[]).map((slide, index) => ({ ...slide, id: Object.keys(section.slides)[index] })) : [], [section.slides]);

    if (!section.enabled || slides.length === 0) {
        return <div className="text-center text-sm text-gray-500 p-4 border rounded-lg bg-gray-50 mt-4">Preview will appear here when enabled and slides are added.</div>;
    }
    
    return (
        <div className="mt-4 p-2 border rounded-lg bg-gray-100">
            <h4 className="text-sm font-semibold mb-2 text-center text-gray-600">Live Preview</h4>
            <div className="w-full" style={{ height: section.height || '150px' }}>
                <div className="flex h-full overflow-x-auto scrollbar-hide">
                    {slides.map((slide, index) => (
                        <div key={`${slide.id}-${index}`} className="flex-shrink-0 h-full mx-2 rounded-md overflow-hidden shadow" style={{ width: section.slideWidth || '200px', aspectRatio: section.slideAspectRatio || '16/9', backgroundColor: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <div className="p-2">
                                <p className="font-bold text-xs uppercase">{slide.type}</p>
                                <p className="text-xs truncate">{slide.caption || slide.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const getInitialHomepageSettings = () => ({
    productShowcaseSection: { 
        enabled: true, 
        image: "https://images.unsplash.com/photo-1557534401-4e7a833215f6?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", 
        text: "Discover Yourself", 
        location: 'default', 
        order: 20 
    } as ProductShowcaseSettings,
    shopByCategoryTitle: 'Shop by Category',
    categoryCardSettings: {
        height: '384px', borderRadiusTop: '150px', borderRadiusBottom: '12px',
        decorationIcon: 'sparkle', customDecorationIconUrl: '',
        decorationIconSize: 32, decorationIconColor: '#6B7F73', frameImageUrl: ''
    } as CategoryCardSettings,
    heroSection: {} as Partial<HeroSettings>,
    usageSection: { enabled: true, title: '', subtitle: '', box1Text: '', box2Text: '', image: '' },
    imageScroller: { enabled: false, slides: {}, slideSize: 'medium' } as ImageScrollerSettings,
    embedScrollers: {} as { [key: string]: EmbedScrollerSettings },
    offerSections: {} as { [key: string]: OfferSectionSettings },
    bestsellerLists: {} as { [key: string]: BestsellerListSettings },
    highlightedNote: { enabled: false, title: '', text: '', backgroundColor: '#F8F7F4', textColor: '#333333' } as HighlightedNoteSettings,
    testimonials: { enabled: false, title: 'What Our Customers Say', authors: {} } as TestimonialsSettings,
    decorativeOverlays: {} as { hero?: DecorativeOverlay, productShowcase?: DecorativeOverlay },
});

const HomepageSettingsManager: FC<{ openImagePicker: (callback: (url: string) => void) => void }> = ({ openImagePicker }) => {
    const [settings, setSettings] = useState(getInitialHomepageSettings());
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [overlayOpacity, setOverlayOpacity] = useState(50);
    const [heroPreviewMode, setHeroPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    useEffect(() => {
        const settingsRef = db.ref('site_settings');
        const productsRef = db.ref('products');
        const categoriesRef = db.ref('categories');
        
        const settingsListener = settingsRef.on('value', snapshot => {
            const dataFromFirebase = snapshot.val();
            if (dataFromFirebase) {
                setSettings(mergeDeep({}, getInitialHomepageSettings(), dataFromFirebase));
                 const opacityMatch = (dataFromFirebase.heroSection?.overlayColor || '').match(/, ([\d\.]+)\)/);
                 if (opacityMatch) setOverlayOpacity(parseFloat(opacityMatch[1]) * 100);
            } else {
                setSettings(getInitialHomepageSettings());
            }
        });
        productsRef.on('value', snapshot => setProducts(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));
        categoriesRef.on('value', snapshot => setCategories(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));

        return () => { settingsRef.off('value', settingsListener); productsRef.off(); categoriesRef.off(); };
    }, []);

    const handleSettingsChange = (path: string, value: any) => {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]] = current[keys[i]] || {};
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };
    
    const handleAdd = (path: string, newItemData: any) => {
        const newId = db.ref().push().key!;
        handleSettingsChange(`${path}.${newId}`, { id: newId, ...newItemData });
    };

    const handleRemove = (path: string) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) return newState;
                current = current[keys[i]];
            }
            delete current[keys[keys.length - 1]];
            return newState;
        });
    };

    const handleOfferProductToggle = (sectionId: string, productId: string) => {
        const currentIds = settings.offerSections[sectionId]?.productIds || {};
        const newIds = { ...currentIds };
        if (newIds[productId]) delete newIds[productId]; else newIds[productId] = true;
        handleSettingsChange(`offerSections.${sectionId}.productIds`, newIds);
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOverlayOpacity(parseInt(e.target.value, 10));
        handleSettingsChange('heroSection.overlayColor', `rgba(255, 255, 255, ${e.target.value / 100})`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try { await db.ref('site_settings').update(settings); alert("Settings saved successfully!"); } 
        catch (error) { alert("Failed to save settings.");} 
        finally { setLoading(false); }
    };

    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    const textareaStyle = `${inputStyle} h-24`;
    
    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center"><h1 className="text-3xl font-serif font-bold text-brand-dark">Homepage Settings</h1><button type="submit" disabled={loading} className="bg-brand-green text-white px-8 py-3 rounded-full font-medium disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Homepage Settings'}</button></div>

                <CollapsibleSection title="Hero Section (Top Banner)" startsOpen={true}>
                    <div className="space-y-4 max-w-4xl">
                        <div className="flex gap-4">
                            <input type="text" value={settings.heroSection?.image || ''} onChange={e => handleSettingsChange('heroSection.image', e.target.value)} className={`${inputStyle} flex-grow`} placeholder="Paste image URL" />
                            <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('heroSection.image', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700">Image Overlay Opacity (White)</label><div className="flex items-center space-x-4"><input type="range" min="0" max="100" value={overlayOpacity} onChange={handleOpacityChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /><span className="text-sm text-gray-600">{overlayOpacity}%</span></div></div>
                    
                    <div className="p-3 border rounded-lg space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Image Styling</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h4 className="font-semibold mb-2">Desktop</h4>
                                <label className="block text-xs font-medium text-gray-600">Zoom (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="500" value={settings.heroSection?.imageStyles?.desktop?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.zoom', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.desktop?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.zoom', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus X (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.desktop?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.focusX', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.desktop?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.focusX', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus Y (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.desktop?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.focusY', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.desktop?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.focusY', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Tablet</h4>
                                <label className="block text-xs font-medium text-gray-600">Zoom (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="500" value={settings.heroSection?.imageStyles?.tablet?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.zoom', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.tablet?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.zoom', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus X (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.tablet?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.focusX', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.tablet?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.focusX', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus Y (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.tablet?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.focusY', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.tablet?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.tablet.focusY', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Mobile</h4>
                                <label className="block text-xs font-medium text-gray-600">Zoom (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="500" value={settings.heroSection?.imageStyles?.mobile?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.zoom', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.mobile?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.zoom', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus X (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.mobile?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.focusX', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.mobile?.focusX || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.focusX', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus Y (%)</label>
                                <div className="flex items-center gap-2"><input type="range" min="0" max="100" value={settings.heroSection?.imageStyles?.mobile?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.focusY', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/><input type="number" value={settings.heroSection?.imageStyles?.mobile?.focusY || 50} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.focusY', Number(e.target.value))} className="w-20 p-1 border rounded text-sm"/></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={settings.heroSection.preheadline || ''} onChange={e => handleSettingsChange('heroSection.preheadline', e.target.value)} placeholder="Pre-headline" className={inputStyle} />
                        <input type="number" value={settings.heroSection.fontSizes?.preheadline || 36} onChange={e => handleSettingsChange('heroSection.fontSizes.preheadline', Number(e.target.value))} className={inputStyle} />
                        <input type="text" value={settings.heroSection.headline || ''} onChange={e => handleSettingsChange('heroSection.headline', e.target.value)} placeholder="Headline" className={inputStyle} />
                        <input type="number" value={settings.heroSection.fontSizes?.headline || 80} onChange={e => handleSettingsChange('heroSection.fontSizes.headline', Number(e.target.value))} className={inputStyle} />
                        <textarea value={settings.heroSection.subheadline || ''} onChange={e => handleSettingsChange('heroSection.subheadline', e.target.value)} placeholder="Sub-headline" className={`${textareaStyle} md:col-span-2`} />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Button</label>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                             <input type="text" value={settings.heroSection.buttonText || ''} onChange={e => handleSettingsChange('heroSection.buttonText', e.target.value)} placeholder="Button Text" className={inputStyle} />
                             <select value={settings.heroSection.buttonLinkType || 'none'} onChange={e => { handleSettingsChange('heroSection.buttonLink', ''); handleSettingsChange('heroSection.buttonLinkType', e.target.value); }} className={inputStyle}>
                                <option value="none">No Link</option><option value="internal">Internal Page</option><option value="external">External / Direct Link</option><option value="product">Product</option><option value="category">Category</option>
                            </select>
                             <div>
                                {settings.heroSection.buttonLinkType === 'internal' && <input type="text" value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop" />}
                                {settings.heroSection.buttonLinkType === 'external' && <input type="text" value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle} placeholder="https://..." />}
                                {settings.heroSection.buttonLinkType === 'product' && <select value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle}><option value="">-- Select Product --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}
                                {settings.heroSection.buttonLinkType === 'category' && <select value={(settings.heroSection.buttonLink || '').split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id === e.target.value); handleSettingsChange(`heroSection.buttonLink`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select Category --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}
                            </div>
                         </div>
                    </div>
                    <div className="flex space-x-2">
                        <button type="button" onClick={() => setHeroPreviewMode('desktop')} className={`px-4 py-2 text-sm rounded-md ${heroPreviewMode === 'desktop' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>Desktop Preview</button>
                        <button type="button" onClick={() => setHeroPreviewMode('tablet')} className={`px-4 py-2 text-sm rounded-md ${heroPreviewMode === 'tablet' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>Tablet Preview</button>
                        <button type="button" onClick={() => setHeroPreviewMode('mobile')} className={`px-4 py-2 text-sm rounded-md ${heroPreviewMode === 'mobile' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>Mobile Preview</button>
                    </div>
                    <HeroPreview settings={settings.heroSection} previewMode={heroPreviewMode} /></div>
                </CollapsibleSection>
                
                <CollapsibleSection title="Product Showcase Section">
                    <div className="max-w-3xl space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={settings.productShowcaseSection?.enabled || false} onChange={e => handleSettingsChange('productShowcaseSection.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                            <span>Enable this section</span>
                        </label>
                        {settings.productShowcaseSection?.enabled && (
                            <div className="space-y-4 mt-4 animate-fade-in-up">
                                <div><label className="block text-sm font-medium text-gray-700">Showcase Image</label>
                                <div className="flex gap-4">
                                  <input type="text" value={settings.productShowcaseSection.image} onChange={e => handleSettingsChange('productShowcaseSection.image', e.target.value)} placeholder="Image URL" className={inputStyle} />
                                  <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('productShowcaseSection.image', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                </div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700">Showcase Text</label><input type="text" value={settings.productShowcaseSection.text} onChange={e => handleSettingsChange('productShowcaseSection.text', e.target.value)} placeholder="e.g. Discover Yourself" className={inputStyle} /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium">Location on Homepage</label><select value={settings.productShowcaseSection.location || 'default'} onChange={e=>handleSettingsChange('productShowcaseSection.location', e.target.value)} className={inputStyle}><option value="top">Top (Below Categories)</option><option value="default">Default (Middle)</option><option value="bottom">Bottom (Above Footer)</option></select></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Display Order</label><input type="number" value={settings.productShowcaseSection.order} onChange={e => handleSettingsChange('productShowcaseSection.order', Number(e.target.value))} className={inputStyle}/></div>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Decorative Overlays (Frames, etc.)">
                    <div className="max-w-3xl space-y-6">
                        <p className="text-sm text-gray-500">Add decorative PNG images (like frames or stars) on top of major site sections. Use transparent PNGs for the best effect.</p>
                        {/* Hero Overlay */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Hero Section Overlay</h4>
                            <div className="flex gap-4">
                                <input type="text" value={settings.decorativeOverlays?.hero?.url || ''} onChange={e => handleSettingsChange('decorativeOverlays.hero.url', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Paste image URL" />
                                <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('decorativeOverlays.hero.url', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings.decorativeOverlays?.hero?.opacity ?? 1) * 100)}%)</label>
                                <input type="range" min="0" max="100" value={(settings.decorativeOverlays?.hero?.opacity ?? 1) * 100} onChange={e => handleSettingsChange('decorativeOverlays.hero.opacity', Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                        {/* Product Showcase Overlay */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Product Showcase Overlay</h4>
                             <div className="flex gap-4">
                                <input type="text" value={settings.decorativeOverlays?.productShowcase?.url || ''} onChange={e => handleSettingsChange('decorativeOverlays.productShowcase.url', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Paste image URL" />
                                <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('decorativeOverlays.productShowcase.url', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings.decorativeOverlays?.productShowcase?.opacity ?? 1) * 100)}%)</label>
                                <input type="range" min="0" max="100" value={(settings.decorativeOverlays?.productShowcase?.opacity ?? 1) * 100} onChange={e => handleSettingsChange('decorativeOverlays.productShowcase.opacity', Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Shop by Category Section">
                    <div className="max-w-3xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Section Title</label>
                            <input type="text" value={settings.shopByCategoryTitle} onChange={e => handleSettingsChange('shopByCategoryTitle', e.target.value)} className={inputStyle} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border p-4 rounded-lg space-y-4">
                                <h4 className="font-semibold">Card Styling</h4>
                                <div>
                                    <label className="block text-sm font-medium">Card Height</label>
                                    <input type="text" value={settings.categoryCardSettings?.height || ''} onChange={e => handleSettingsChange('categoryCardSettings.height', e.target.value)} placeholder="e.g. 384px" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Top Border Radius</label>
                                    <input type="text" value={settings.categoryCardSettings?.borderRadiusTop || ''} onChange={e => handleSettingsChange('categoryCardSettings.borderRadiusTop', e.target.value)} placeholder="e.g. 150px or 1rem" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Bottom Border Radius</label>
                                    <input type="text" value={settings.categoryCardSettings?.borderRadiusBottom || ''} onChange={e => handleSettingsChange('categoryCardSettings.borderRadiusBottom', e.target.value)} placeholder="e.g. 12px or 0.75rem" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Custom Frame Image (PNG)</label>
                                    <div className="flex gap-4">
                                      <input type="text" value={settings.categoryCardSettings?.frameImageUrl || ''} onChange={e => handleSettingsChange('categoryCardSettings.frameImageUrl', e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                      <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('categoryCardSettings.frameImageUrl', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                    </div>
                                </div>

                                <h4 className="font-semibold pt-4 border-t">Decoration Icon</h4>
                                <div>
                                    <label className="block text-sm font-medium">Icon Type</label>
                                    <select value={settings.categoryCardSettings?.decorationIcon || 'sparkle'} onChange={e => handleSettingsChange('categoryCardSettings.decorationIcon', e.target.value)} className={inputStyle}>
                                        <option value="sparkle">Sparkle</option>
                                        <option value="star">Star</option>
                                        <option value="leaf">Leaf</option>
                                        <option value="custom">Custom Image</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                {settings.categoryCardSettings?.decorationIcon === 'custom' && (
                                     <div>
                                        <label className="block text-sm font-medium">Custom Icon Image (PNG)</label>
                                        <div className="flex gap-4">
                                          <input type="text" value={settings.categoryCardSettings?.customDecorationIconUrl || ''} onChange={e => handleSettingsChange('categoryCardSettings.customDecorationIconUrl', e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                          <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('categoryCardSettings.customDecorationIconUrl', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Icon Size (px)</label>
                                        <input type="number" value={settings.categoryCardSettings?.decorationIconSize || 32} onChange={e => handleSettingsChange('categoryCardSettings.decorationIconSize', Number(e.target.value))} className={inputStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Icon Color</label>
                                        <input type="color" value={settings.categoryCardSettings?.decorationIconColor || '#6B7F73'} onChange={e => handleSettingsChange('categoryCardSettings.decorationIconColor', e.target.value)} className={`${inputStyle} h-10 p-1`} />
                                    </div>
                                </div>

                            </div>
                            <div className="border p-4 rounded-lg bg-gray-50 flex flex-col items-center justify-center">
                                <h4 className="font-semibold mb-4">Live Preview</h4>
                                <div className="relative group text-center flex-shrink-0 w-56 cursor-pointer scale-75">
                                    <div className="relative p-2 mx-auto border border-gray-300 shadow-sm" style={{ height: settings.categoryCardSettings?.height, borderTopLeftRadius: settings.categoryCardSettings?.borderRadiusTop, borderTopRightRadius: settings.categoryCardSettings?.borderRadiusTop, borderBottomLeftRadius: settings.categoryCardSettings?.borderRadiusBottom, borderBottomRightRadius: settings.categoryCardSettings?.borderRadiusBottom }}>
                                        <div className="overflow-hidden h-full bg-gray-200" style={{ borderTopLeftRadius: settings.categoryCardSettings?.borderRadiusTop, borderTopRightRadius: settings.categoryCardSettings?.borderRadiusTop, borderBottomLeftRadius: settings.categoryCardSettings?.borderRadiusBottom, borderBottomRightRadius: settings.categoryCardSettings?.borderRadiusBottom }}>
                                            <img src="https://images.unsplash.com/photo-1556228852-6d42a7465715" alt="Preview" className="w-full h-full object-cover"/>
                                        </div>
                                        {settings.categoryCardSettings?.frameImageUrl && <div className="absolute inset-0 pointer-events-none bg-contain bg-no-repeat bg-center" style={{ backgroundImage: `url('${settings.categoryCardSettings.frameImageUrl}')` }}></div>}
                                        {settings.categoryCardSettings?.decorationIcon !== 'none' && <>
                                            {React.createElement(
                                                settings.categoryCardSettings?.decorationIcon === 'custom' ? 'img' : {sparkle: SparkleIcon, star: StarIcon, leaf: LeafIcon}[settings.categoryCardSettings?.decorationIcon || 'sparkle'],
                                                { src: settings.categoryCardSettings?.decorationIcon === 'custom' ? settings.categoryCardSettings.customDecorationIconUrl : undefined, className: "absolute top-16 -left-1 opacity-80", style: { color: settings.categoryCardSettings?.decorationIconColor, width: `${settings.categoryCardSettings?.decorationIconSize}px`, height: `${settings.categoryCardSettings?.decorationIconSize}px`}}
                                            )}
                                            {React.createElement(
                                                settings.categoryCardSettings?.decorationIcon === 'custom' ? 'img' : {sparkle: SparkleIcon, star: StarIcon, leaf: LeafIcon}[settings.categoryCardSettings?.decorationIcon || 'sparkle'],
                                                { src: settings.categoryCardSettings?.decorationIcon === 'custom' ? settings.categoryCardSettings.customDecorationIconUrl : undefined, className: "absolute top-16 -right-1 opacity-80", style: { color: settings.categoryCardSettings?.decorationIconColor, width: `${settings.categoryCardSettings?.decorationIconSize}px`, height: `${settings.categoryCardSettings?.decorationIconSize}px`}}
                                            )}
                                        </>}
                                    </div>
                                    <h3 className="mt-4 text-lg font-serif font-bold text-gray-800">Category Name</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Highlighted Note Card">
                    <div className="max-w-3xl space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.highlightedNote?.enabled || false} onChange={e => handleSettingsChange('highlightedNote.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                        {settings.highlightedNote?.enabled && <div className="space-y-4 mt-4">
                            <input type="text" value={settings.highlightedNote.title} onChange={e => handleSettingsChange('highlightedNote.title', e.target.value)} placeholder="Note Title" className={inputStyle} />
                            <textarea value={settings.highlightedNote.text} onChange={e => handleSettingsChange('highlightedNote.text', e.target.value)} placeholder="Note Text" className={textareaStyle} />
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm">Background Color</label><input type="color" value={settings.highlightedNote.backgroundColor} onChange={e => handleSettingsChange('highlightedNote.backgroundColor', e.target.value)} className={`${inputStyle} h-10 p-1`}/></div>
                                <div><label className="text-sm">Text Color</label><input type="color" value={settings.highlightedNote.textColor} onChange={e => handleSettingsChange('highlightedNote.textColor', e.target.value)} className={`${inputStyle} h-10 p-1`}/></div>
                            </div>
                        </div>}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Testimonials / Authors">
                   <div className="max-w-3xl space-y-4">
                       <label className="flex items-center space-x-3 cursor-pointer">
                           <input
                               type="checkbox"
                               checked={settings.testimonials?.enabled || false}
                               onChange={e => handleSettingsChange('testimonials.enabled', e.target.checked)}
                               className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                           />
                           <span>Enable this section</span>
                       </label>
                       {settings.testimonials?.enabled && (
                           <div className="space-y-4 mt-4">
                               <div>
                                   <label className="block text-sm font-medium text-gray-700">Section Title</label>
                                   <input
                                       type="text"
                                       value={settings.testimonials.title}
                                       onChange={e => handleSettingsChange('testimonials.title', e.target.value)}
                                       placeholder="e.g. What Our Customers Say"
                                       className={inputStyle}
                                   />
                               </div>
                               {settings.testimonials.authors && Object.entries(settings.testimonials.authors).map(([id, author]: [string, any]) => (
                                   <div key={id} className="border p-4 rounded-lg space-y-3 relative">
                                       <button
                                           type="button"
                                           onClick={() => handleRemove(`testimonials.authors.${id}`)}
                                           className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-2"
                                       >
                                           <TrashIcon className="w-5 h-5"/>
                                       </button>
                                       <div className="flex items-start gap-4">
                                           <div className="w-1/4">
                                               <label className="block text-sm font-medium text-gray-700 mb-1">Author Image</label>
                                               <img src={author.image || 'https://via.placeholder.com/100'} alt="author" className="w-24 h-24 object-cover rounded-full border bg-gray-100" />
                                           </div>
                                           <div className="w-3/4 space-y-2">
                                                <div className="flex gap-4">
                                                    <input type="text" value={author.image} onChange={e => handleSettingsChange(`testimonials.authors.${id}.image`, e.target.value)} placeholder="Image URL" className={inputStyle}/>
                                                    <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange(`testimonials.authors.${id}.image`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                                </div>
                                               <input type="text" value={author.name} onChange={e => handleSettingsChange(`testimonials.authors.${id}.name`, e.target.value)} placeholder="Author Name" className={inputStyle}/>
                                           </div>
                                       </div>
                                       <textarea
                                           value={author.quote}
                                           onChange={e => handleSettingsChange(`testimonials.authors.${id}.quote`, e.target.value)}
                                           placeholder="Author's Quote"
                                           className={textareaStyle}
                                           rows={3}
                                       />
                                   </div>
                               ))}
                               <button
                                   type="button"
                                   onClick={() => handleAdd('testimonials.authors', { name: 'New Author', quote: '', image: 'https://via.placeholder.com/100' })}
                                   className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"
                               >
                                   <PlusIcon className="w-4 h-4"/> Add Author
                               </button>
                           </div>
                       )}
                   </div>
               </CollapsibleSection>
               
                <CollapsibleSection title="Usage Guide Section">
                    <div className="max-w-3xl space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.usageSection?.enabled !== false}
                                onChange={e => handleSettingsChange('usageSection.enabled', e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                            />
                            <span>Enable this section</span>
                        </label>
                        {settings.usageSection?.enabled !== false && (
                            <div className="space-y-4 mt-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Section Title</label>
                                    <input type="text" value={settings.usageSection.title} onChange={e => handleSettingsChange('usageSection.title', e.target.value)} placeholder="e.g. Using Our Product" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                                    <textarea value={settings.usageSection.subtitle} onChange={e => handleSettingsChange('usageSection.subtitle', e.target.value)} placeholder="e.g. It is a long established fact..." className={textareaStyle} rows={2} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Content Box 1</label>
                                    <textarea value={settings.usageSection.box1Text} onChange={e => handleSettingsChange('usageSection.box1Text', e.target.value)} placeholder="Text for the first box" className={textareaStyle} rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Content Box 2 (Highlighted)</label>
                                    <textarea value={settings.usageSection.box2Text} onChange={e => handleSettingsChange('usageSection.box2Text', e.target.value)} placeholder="Text for the second, highlighted box" className={textareaStyle} rows={2} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Image</label>
                                    <div className="flex gap-4">
                                        <input type="text" value={settings.usageSection.image || ''} onChange={e => handleSettingsChange('usageSection.image', e.target.value)} className={`${inputStyle}`} placeholder="Or paste image URL" />
                                        <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('usageSection.image', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                 <CollapsibleSection title="Auto-Scrolling Posters">
                     <div className="max-w-3xl space-y-4">{/* Image Scroller */}
                        <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.imageScroller?.enabled || false} onChange={e => handleSettingsChange('imageScroller.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                         {settings.imageScroller?.enabled && <div className="space-y-4 mt-4">{settings.imageScroller.slides && Object.entries(settings.imageScroller.slides).map(([id, slide]: [string, any]) => (<div key={id} className="border p-3 rounded-md space-y-2"><div className="flex items-start gap-4"><div className="w-1/3"><label className="block text-sm font-medium text-gray-700 mb-1">Poster Image</label><img src={slide.image || 'https://via.placeholder.com/150x200'} alt="poster" className="w-full aspect-[3/4] object-cover rounded border bg-gray-100" /></div><div className="w-2/3 space-y-2">
                         <div className="flex gap-4">
                            <input type="text" value={slide.image} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.image`, e.target.value)} placeholder="Image URL" className={inputStyle} />
                            <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange(`imageScroller.slides.${id}.image`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                         </div>
                         <input type="text" value={slide.altText} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.altText`, e.target.value)} placeholder="Alt Text" className={inputStyle} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center"><select value={slide.linkType} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.linkType`, e.target.value)} className={inputStyle}><option value="none">No Link</option><option value="internal">Internal Page</option><option value="external">External / Direct Link</option><option value="product">Product</option><option value="category">Category</option></select><div>{slide.linkType === 'internal' && <input type="text" value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop" />}{slide.linkType === 'external' && <input type="text" value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle} placeholder="https://..." />}{slide.linkType === 'product' && <select value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}{slide.linkType === 'category' && <select value={slide.link?.split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id===e.target.value); handleSettingsChange(`imageScroller.slides.${id}.link`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}</div></div><button type="button" onClick={() => handleRemove(`imageScroller.slides.${id}`)} className="text-sm text-red-600 hover:underline">Remove Slide</button></div>))}<button type="button" onClick={() => handleAdd('imageScroller.slides', { image: '', linkType: 'none', link: '' })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Slide</button></div>}
                    </div>
                </CollapsibleSection>

                 <CollapsibleSection title="Embed Scroller Sections">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Create auto-scrolling sections with embedded content like YouTube videos, HTML, or other iframes.</p>
                        {(Object.values(settings.embedScrollers || {}) as EmbedScrollerSettings[]).sort((a,b) => (a.order || 0) - (b.order || 0)).map(section => (
                            <div key={section.id} className="border p-4 rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800">Scroller: {section.title || "Untitled"}</h3>
                                    <button type="button" onClick={() => handleRemove(`embedScrollers.${section.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                                <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={section.enabled} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" value={section.title} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.title`, e.target.value)} placeholder="Section Title" className={inputStyle}/>
                                    <input type="number" value={section.order} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.order`, Number(e.target.value))} placeholder="Display Order" className={inputStyle}/>
                                    <select value={section.location || 'default'} onChange={e=>handleSettingsChange(`embedScrollers.${section.id}.location`, e.target.value)} className={inputStyle}><option value="top">Top</option><option value="default">Default</option><option value="bottom">Bottom</option></select>
                                    <input type="text" value={section.height} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.height`, e.target.value)} placeholder="Height (e.g., 250px)" className={inputStyle}/>
                                    <input type="text" value={section.slideWidth || '300px'} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.slideWidth`, e.target.value)} placeholder="Slide Width (e.g., 300px)" className={inputStyle}/>
                                    <input type="text" value={section.slideAspectRatio || '16/9'} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.slideAspectRatio`, e.target.value)} placeholder="Aspect Ratio (e.g., 16/9)" className={inputStyle}/>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={section.autoplay} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.autoplay`, e.target.checked)} className="h-4 w-4"/><span>Autoplay</span></label>
                                    <input type="number" value={section.interval} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.interval`, Number(e.target.value))} placeholder="Interval (ms)" className={inputStyle} disabled={!section.autoplay}/>
                                </div>
                                <div className="space-y-2 border-t pt-3">
                                    <h4 className="font-semibold text-sm">Slides</h4>
                                    {section.slides && Object.entries(section.slides).map(([slideId, slide]: [string, any]) => (
                                        <div key={slideId} className="border p-3 rounded-md space-y-2 bg-gray-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                                <select value={slide.type} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.slides.${slideId}.type`, e.target.value)} className={inputStyle}>
                                                    <option value="youtube">YouTube</option><option value="video">Video URL</option><option value="html">HTML</option><option value="iframe">Iframe URL</option>
                                                </select>
                                                <input type="text" value={slide.caption} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.slides.${slideId}.caption`, e.target.value)} placeholder="Caption (optional)" className={inputStyle} />
                                                <button type="button" onClick={() => handleRemove(`embedScrollers.${section.id}.slides.${slideId}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                            <textarea value={slide.content} onChange={e => handleSettingsChange(`embedScrollers.${section.id}.slides.${slideId}.content`, e.target.value)} placeholder={slide.type === 'youtube' ? 'YouTube Video ID' : 'URL or HTML Content'} className={inputStyle} rows={3}></textarea>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAdd(`embedScrollers.${section.id}.slides`, { type: 'youtube', content: '', caption: '' })} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Slide</button>
                                </div>
                                <EmbedScrollerPreview section={section} />
                            </div>
                        ))}
                        <button type="button" onClick={() => handleAdd('embedScrollers', { enabled: true, title: 'New Scroller', slides: {}, order: (Object.keys(settings.embedScrollers || {}).length + 1) * 10, location: 'default', height: '250px', autoplay: true, interval: 3000, slideWidth: '320px', slideAspectRatio: '16/9' })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Embed Scroller Section</button>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Custom Product Sections">
                    <div className="max-w-3xl space-y-4"> {/* Custom Product Sections */}
                        {(Object.values(settings.offerSections) as OfferSectionSettings[]).sort((a,b) => (a.order || 0) - (b.order || 0)).map((section) => (<div key={section.id} className="border p-4 rounded-lg space-y-3"><div className="flex justify-between items-center"><h3 className="font-semibold text-gray-800">Section: {section.title || "Untitled"}</h3><button type="button" onClick={() => handleRemove(`offerSections.${section.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button></div><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={section.enabled} onChange={e => handleSettingsChange(`offerSections.${section.id}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Section Title</label><input type="text" value={section.title} onChange={e => handleSettingsChange(`offerSections.${section.id}.title`, e.target.value)} placeholder="e.g. Best Offers" className={inputStyle}/></div>
                            <div><label className="block text-sm font-medium text-gray-700">Display Order</label><input type="number" value={section.order} onChange={e => handleSettingsChange(`offerSections.${section.id}.order`, Number(e.target.value))} className={inputStyle}/></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title Image (optional, PNG)</label>
                            <div className="flex gap-4">
                                <input type="text" value={section.titleImageUrl || ''} onChange={e => handleSettingsChange(`offerSections.${section.id}.titleImageUrl`, e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange(`offerSections.${section.id}.titleImageUrl`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-sm font-medium">Location on Homepage</label><select value={section.location || 'default'} onChange={e=>handleSettingsChange(`offerSections.${section.id}.location`, e.target.value)} className={inputStyle}><option value="top">Top (Below Categories)</option><option value="default">Default (Middle)</option><option value="bottom">Bottom (Above Bestsellers)</option></select></div>
                             <div>
                                <label className="block text-sm font-medium">Layout</label>
                                <select value={section.layout || 'grid'} onChange={e=>handleSettingsChange(`offerSections.${section.id}.layout`, e.target.value)} className={inputStyle}>
                                    <option value="grid">Grid</option>
                                    <option value="list">Vertical List</option>
                                    <option value="horizontal-scroll">Horizontal Scroll</option>
                                    <option value="single">Single Product</option>
                                </select>
                             </div>
                             {section.layout === 'grid' && <div><label className="block text-sm font-medium">Grid Columns</label><input type="number" min="1" max="6" value={section.gridCols || 4} onChange={e=>handleSettingsChange(`offerSections.${section.id}.gridCols`, Number(e.target.value))} className={inputStyle}/></div>}
                             {section.layout === 'horizontal-scroll' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium">Items to Show</label>
                                        <input type="number" min="1" max="10" value={section.itemsToShow || 4} onChange={e=>handleSettingsChange(`offerSections.${section.id}.itemsToShow`, Number(e.target.value))} className={inputStyle}/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Item Decoration Image (e.g., Garland)</label>
                                        <div className="flex gap-4">
                                          <input type="text" value={section.decorationImageUrl || ''} onChange={e => handleSettingsChange(`offerSections.${section.id}.decorationImageUrl`, e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                          <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange(`offerSections.${section.id}.decorationImageUrl`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                                        </div>
                                    </div>
                                </>
                             )}
                             <div><label className="block text-sm font-medium">Content Alignment</label><select value={section.contentAlignment || 'center'} onChange={e=>handleSettingsChange(`offerSections.${section.id}.contentAlignment`, e.target.value)} className={inputStyle}><option value="start">Top</option><option value="center">Center</option><option value="end">Bottom</option></select></div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Select Products to Feature</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-2 rounded-md">{products.map(product => (<label key={product.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer text-sm"><input type="checkbox" checked={!!section.productIds?.[String(product.id)]} onChange={() => handleOfferProductToggle(section.id, String(product.id))} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green"/><span>{product.name}</span></label>))}</div></div></div>))}<button type="button" onClick={() => handleAdd('offerSections', { enabled: true, title: 'New Section', productIds: {}, order: (Object.keys(settings.offerSections).length + 1) * 10, layout: 'grid', gridCols: 4, contentAlignment: 'center', location: 'default' })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Custom Section</button></div>
                </CollapsibleSection>

                <CollapsibleSection title="Bestseller Lists">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Create and manage lists of bestseller products to display on the homepage.</p>
                        {(Object.values(settings.bestsellerLists || {}) as BestsellerListSettings[]).sort((a,b) => (a.order || 0) - (b.order || 0)).map((section) => (
                            <div key={section.id} className="border p-4 rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800">List: {section.title || "Untitled"}</h3>
                                    <button type="button" onClick={() => handleRemove(`bestsellerLists.${section.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={section.enabled} onChange={e => handleSettingsChange(`bestsellerLists.${section.id}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                                    <span>Enable this list</span>
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">List Title</label>
                                        <input type="text" value={section.title} onChange={e => handleSettingsChange(`bestsellerLists.${section.id}.title`, e.target.value)} placeholder="e.g. Our Top Picks" className={inputStyle}/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Display Order</label>
                                        <input type="number" value={section.order} onChange={e => handleSettingsChange(`bestsellerLists.${section.id}.order`, Number(e.target.value))} className={inputStyle}/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Location on Homepage</label>
                                        <select value={section.location || 'default'} onChange={e=>handleSettingsChange(`bestsellerLists.${section.id}.location`, e.target.value)} className={inputStyle}>
                                            <option value="top">Top (Below Categories)</option>
                                            <option value="default">Default (Middle)</option>
                                            <option value="bottom">Bottom (Above Footer)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Layout</label>
                                        <select value={section.layout || 'grid'} onChange={e=>handleSettingsChange(`bestsellerLists.${section.id}.layout`, e.target.value)} className={inputStyle}>
                                            <option value="grid">Grid</option>
                                            <option value="horizontal-scroll">Horizontal Scroll</option>
                                        </select>
                                    </div>
                                </div>
                                {section.layout === 'grid' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium">Grid Columns</label><input type="number" min="1" max="6" value={section.gridCols || 4} onChange={e=>handleSettingsChange(`bestsellerLists.${section.id}.gridCols`, Number(e.target.value))} className={inputStyle}/></div>
                                        <div><label className="block text-sm font-medium">Number of Rows</label><input type="number" min="1" value={section.rows || 1} onChange={e=>handleSettingsChange(`bestsellerLists.${section.id}.rows`, Number(e.target.value))} className={inputStyle}/></div>
                                    </div>
                                )}
                                {section.layout === 'horizontal-scroll' && (
                                    <div>
                                        <label className="block text-sm font-medium">Items to Show</label>
                                        <input type="number" min="1" max="10" value={section.itemsToShow || 4} onChange={e=>handleSettingsChange(`bestsellerLists.${section.id}.itemsToShow`, Number(e.target.value))} className={inputStyle}/>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Products for this List</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-2 rounded-md">
                                        {products.map(product => (
                                            <label key={product.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer text-sm">
                                                <input type="checkbox" checked={!!section.productIds?.[String(product.id)]} onChange={() => {
                                                    const currentIds = settings.bestsellerLists?.[section.id]?.productIds || {};
                                                    const newIds = { ...currentIds };
                                                    if (newIds[String(product.id)]) delete newIds[String(product.id)]; else newIds[String(product.id)] = true;
                                                    handleSettingsChange(`bestsellerLists.${section.id}.productIds`, newIds);
                                                }} className="h-4 w-4 text-brand-green border-gray-300 rounded focus:ring-brand-green"/>
                                                <span>{product.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => handleAdd('bestsellerLists', { enabled: true, title: 'New Bestseller List', productIds: {}, order: ((Object.keys(settings.bestsellerLists || {}).length) + 1) * 10, layout: 'grid', gridCols: 4, rows: 1, location: 'bottom' })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1">
                            <PlusIcon className="w-4 h-4"/> Add Bestseller List
                        </button>
                    </div>
                </CollapsibleSection>
            </form>
        </div>
    );
};

const ActionButtonEditor: FC<{ path: string, settings: Partial<ActionButtonSettings>, onChange: (path: string, value: any) => void, products: Product[], categories: Category[] }> = ({ path, settings, onChange, products, categories }) => {
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    
    return (
        <div className="border p-4 rounded-lg space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.enabled ?? true} onChange={e => onChange(`${path}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this button</span></label>
            { (settings.enabled ?? true) && <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium">Button Text</label><input type="text" value={settings.text || ''} onChange={e => onChange(`${path}.text`, e.target.value)} className={inputStyle}/></div>
                    <div><label className="block text-sm font-medium">Icon</label><select value={settings.icon || 'none'} onChange={e => onChange(`${path}.icon`, e.target.value)} className={inputStyle}><option value="none">None</option><option value="cart">Cart</option><option value="arrowRight">Arrow</option><option value="phone">Phone</option><option value="mail">Email</option></select></div>
                    <div><label className="block text-sm font-medium">Style</label><select value={settings.style || 'primary'} onChange={e => onChange(`${path}.style`, e.target.value)} className={inputStyle}><option value="primary">Primary (Green)</option><option value="secondary">Secondary (Dark)</option></select></div>
                </div>
                <div><label className="block text-sm font-medium">Action / Link Type</label><select value={settings.linkType || 'default'} onChange={e => { onChange(`${path}.link`, ''); onChange(`${path}.linkType`, e.target.value); }} className={inputStyle}><option value="default">Default E-commerce Action</option><option value="internal">Internal Page</option><option value="external">External / Direct Link</option><option value="product">Product</option><option value="category">Category</option><option value="phone">Phone Number</option><option value="email">Email Address</option></select></div>
                {settings.linkType && settings.linkType !== 'default' && <div><label className="block text-sm font-medium">Link Target</label>
                    {settings.linkType === 'internal' && <input type="text" value={settings.link || ''} onChange={e => onChange(`${path}.link`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop"/>}
                    {settings.linkType === 'external' && <input type="text" value={settings.link || ''} onChange={e => onChange(`${path}.link`, e.target.value)} className={inputStyle} placeholder="https://..."/>}
                    {settings.linkType === 'phone' && <input type="tel" value={settings.link || ''} onChange={e => onChange(`${path}.link`, e.target.value)} className={inputStyle} placeholder="e.g. +1234567890"/>}
                    {settings.linkType === 'email' && <input type="email" value={settings.link || ''} onChange={e => onChange(`${path}.link`, e.target.value)} className={inputStyle} placeholder="e.g. contact@example.com"/>}
                    {settings.linkType === 'product' && <select value={settings.link || ''} onChange={e => onChange(`${path}.link`, e.target.value)} className={inputStyle}><option value="">-- Select Product --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}
                    {settings.linkType === 'category' && <select value={(settings.link || '').split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id === e.target.value); onChange(`${path}.link`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select Category --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}
                </div>}
            </div>}
        </div>
    );
}

// --- Theme Settings Component (Header/Footer) ---
const themes: { name: Theme, label: string, color: string }[] = [
    { name: 'light', label: 'Default Light', color: '#F8F7F4' },
    { name: 'dark', label: 'Midnight Dark', color: '#121212' },
    { name: 'blue', label: 'Ocean Blue', color: '#EFF6FF' },
    { name: 'diwali', label: 'Festive Diwali', color: '#FFFDF2' },
    { name: 'diwali-dark', label: 'Festive Diwali (Dark)', color: '#2C0E37' },
];

const rgbStringToHex = (rgb: string) => {
  if (!rgb || typeof rgb !== 'string') return '#000000';
  if (rgb.startsWith('#')) {
    const validHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return validHex.test(rgb) ? rgb.toUpperCase() : '#000000';
  }
  const parts = rgb.split(' ').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '#000000';
  const [r, g, b] = parts;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const hexToRgbString = (hex: string) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '0 0 0';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '0 0 0';
};

const ColorInput: FC<{ label: string, value: string, onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(hexToRgbString(e.target.value));
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const textValue = e.target.value;
        if (textValue.startsWith('#')) {
             onChange(hexToRgbString(textValue));
        } else {
             onChange(textValue);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_50px] items-center gap-2 py-2 border-b border-gray-100 last:border-b-0">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <input 
                type="text" 
                value={value || ''} 
                onChange={handleTextChange} 
                className="p-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                placeholder="e.g. 107 127 115 or #6B7F73"
            />
            <div className="relative h-9 w-12 cursor-pointer">
                <input 
                    type="color" 
                    value={rgbStringToHex(value || '0 0 0')} 
                    onChange={handleColorPickerChange}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    aria-label={`Change ${label} color`}
                />
                <div 
                    className="w-full h-full rounded-md border border-gray-300 pointer-events-none" 
                    style={{ backgroundColor: `rgb(${value ? value.replace(/ /g, ',') : '0,0,0'})` }}
                ></div>
            </div>
        </div>
    );
};

const DiwaliOverlayEditor: FC<{
    label: string;
    settings: DiwaliOverlaySetting | undefined;
    onSettingChange: (path: string, value: any) => void;
    basePath: string;
    themes: { name: Theme; label: string; color: string }[];
    openImagePicker: (callback: (url: string) => void) => void;
}> = ({ label, settings, onSettingChange, basePath, themes, openImagePicker }) => {
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";

    return (
        <div className="border p-4 rounded-lg space-y-4">
            <h4 className="font-bold text-gray-800">{label}</h4>
            <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={settings?.enabled !== false} onChange={e => onSettingChange(`${basePath}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                <span>Enable this overlay</span>
            </label>
             {settings?.enabled !== false && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings?.opacity ?? 1) * 100)}%)</label>
                        <input type="range" min="0" max="100" value={(settings?.opacity ?? 1) * 100} onChange={e => onSettingChange(`${basePath}.opacity`, Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Image (Light Theme)</label>
                        <div className="flex gap-4">
                            <input type="text" placeholder="Image URL for light theme" value={settings?.url || ''} onChange={e => onSettingChange(`${basePath}.url`, e.target.value)} className={inputStyle} />
                            <button type="button" onClick={() => openImagePicker((url) => onSettingChange(`${basePath}.url`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Image (Dark Theme)</label>
                        <div className="flex gap-4">
                           <input type="text" placeholder="Image URL for dark theme" value={settings?.darkUrl || ''} onChange={e => onSettingChange(`${basePath}.darkUrl`, e.target.value)} className={inputStyle} />
                           <button type="button" onClick={() => openImagePicker((url) => onSettingChange(`${basePath}.darkUrl`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Visible on themes:</label>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                            {themes.map(t => (
                                <label key={t.name} className="flex items-center space-x-1.5 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={settings?.displayOnThemes?.[t.name] ?? false}
                                        onChange={e => onSettingChange(`${basePath}.displayOnThemes.${t.name}`, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                                    />
                                    <span>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
             )}
        </div>
    )
}

const getInitialSiteSettings = () => ({
    siteTitle: 'AURASHKA', 
    logoUrl: 'https://i.ibb.co/WWK', 
    siteTitleImageUrl: '', 
    useImageForTitle: false, 
    activeTheme: 'light' as Theme, 
    themeColors: {light:{}, dark:{}, blue:{}, diwali:{}, 'diwali-dark': {}} as Partial<ThemeColors>, 
    header: { navLinks: {} as { [key: string]: NavLink } }, 
    footer: { description: '', copyrightText: '', columns: {}, newsletter: { title: '', subtitle: '' }, contactInfo: {}, socialLinks: {}, socialIconSize: 24 } as Partial<FooterSettings>,
    diwaliThemeSettings: {} as Partial<DiwaliThemeSettings>,
    floatingDecorations: {} as { [key: string]: FloatingDecoration },
    headerOverlapImage: {} as Partial<HeaderOverlapImageSettings>,
    bottomBlend: {} as Partial<BottomBlendSettings>,
    socialLogin: {} as Partial<SocialLoginSettings>,
    announcementBar: {} as Partial<AnnouncementBarSettings>,
    mobileViewport: 'responsive' as 'responsive' | 'desktop',
    enableGlobalCardOverlay: false,
});

const getInitialPageSettings = () => ({
     shopPage: {} as Partial<ShopPageSettings>,
     searchPage: {} as Partial<ShopPageSettings>,
     productPage: {
        shippingReturnsInfo: '',
        enableRecommendedProducts: true,
        recommendationMode: 'category',
        recommendedCategoryIds: {},
        buttons: {
            addToCart: { enabled: true, text: 'Add to Cart', style: 'secondary', icon: 'cart', linkType: 'default' },
            buyNow: { enabled: true, text: 'Buy Now', style: 'primary', icon: 'arrowRight', linkType: 'default' }
        }
    } as ProductPageSettings,
});

const PageSettingsManager: FC<{openImagePicker: (callback: (url: string) => void) => void }> = ({ openImagePicker }) => {
    const [settings, setSettings] = useState(getInitialPageSettings());
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const settingsRef = db.ref('site_settings');
        const productsRef = db.ref('products');
        const categoriesRef = db.ref('categories');

        const listener = settingsRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data) setSettings(mergeDeep({}, getInitialPageSettings(), data));
            else setSettings(getInitialPageSettings());
        });
        productsRef.on('value', snapshot => setProducts(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));
        categoriesRef.on('value', snapshot => setCategories(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));

        return () => { settingsRef.off('value', listener); productsRef.off(); categoriesRef.off(); };
    }, []);

    const handleSettingsChange = (path: string, value: any) => {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]] = current[keys[i]] || {};
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try { 
            await db.ref('site_settings').update(settings); 
            alert("Settings saved successfully!"); 
        } catch (error) { 
            alert("Failed to save settings."); 
        } finally { 
            setLoading(false); 
        }
    };
    
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-serif font-bold text-brand-dark">Page Settings</h1>
                <button type="submit" disabled={loading} className="bg-brand-green text-white px-8 py-3 rounded-full font-medium disabled:bg-gray-400">
                    {loading ? 'Saving...' : 'Save Page Settings'}
                </button>
            </div>
            <CollapsibleSection title="Shop & Search Pages" startsOpen>
                 <div className="space-y-4 max-w-3xl">
                    <div><label className="block text-sm font-medium text-gray-700">Shop Page Title</label><input type="text" value={settings.shopPage?.title || ''} onChange={e => handleSettingsChange('shopPage.title', e.target.value)} className={inputStyle} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Shop Page Subtitle</label><textarea value={settings.shopPage?.subtitle || ''} onChange={e => handleSettingsChange('shopPage.subtitle', e.target.value)} className={`${inputStyle} h-24`} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Search Page Title</label><input type="text" value={settings.searchPage?.title || ''} onChange={e => handleSettingsChange('searchPage.title', e.target.value)} className={inputStyle} /></div>
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Product Detail Page">
                 <div className="space-y-4 max-w-3xl">
                    <div><label className="block text-sm font-medium text-gray-700">Shipping & Returns Information (HTML supported)</label><textarea value={settings.productPage.shippingReturnsInfo || ''} onChange={e => handleSettingsChange('productPage.shippingReturnsInfo', e.target.value)} className={`${inputStyle} h-40`} /></div>
                     <div>
                        <h4 className="font-semibold mb-2">"You Might Also Like" Section</h4>
                        <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.productPage.enableRecommendedProducts} onChange={e => handleSettingsChange('productPage.enableRecommendedProducts', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                        {settings.productPage.enableRecommendedProducts && <div className="mt-2 pl-8 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Fallback Recommendation Mode</label>
                            <select value={settings.productPage.recommendationMode} onChange={e => handleSettingsChange('productPage.recommendationMode', e.target.value)} className={inputStyle}>
                                <option value="manual">Same Category (Default)</option><option value="category">Specific Categories</option><option value="random">Random from All Products</option>
                            </select>
                             {settings.productPage.recommendationMode === 'category' && <div><label className="block text-sm font-medium text-gray-700 mb-2">Select Categories for Fallback</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border p-2 rounded-md">{categories.map(c => (<label key={c.id} className="flex items-center space-x-2 p-1 border rounded-md hover:bg-gray-50 cursor-pointer text-sm"><input type="checkbox" checked={!!settings.productPage.recommendedCategoryIds?.[c.id]} onChange={e => { const newIds = {...settings.productPage.recommendedCategoryIds}; if(e.target.checked) newIds[c.id] = true; else delete newIds[c.id]; handleSettingsChange('productPage.recommendedCategoryIds', newIds);}} className="h-4 w-4"/><span>{c.name}</span></label>))}</div></div>}
                        </div>}
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Action Buttons</h4>
                        <div className="space-y-4">
                             <div><h5 className="font-medium text-gray-800">"Add to Cart" Button</h5><ActionButtonEditor path="productPage.buttons.addToCart" settings={settings.productPage.buttons.addToCart} onChange={handleSettingsChange} products={products} categories={categories}/></div>
                             <div><h5 className="font-medium text-gray-800">"Buy Now" Button</h5><ActionButtonEditor path="productPage.buttons.buyNow" settings={settings.productPage.buttons.buyNow} onChange={handleSettingsChange} products={products} categories={categories}/></div>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>
        </form>
    )
};


const ThemeAndGlobalSettingsManager: FC<{ openImagePicker: (callback: (url: string) => void) => void }> = ({ openImagePicker }) => {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [activeThemeForEditing, setActiveThemeForEditing] = useState<Theme>('light');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);


    useEffect(() => {
        const settingsRef = db.ref('site_settings');
        const productsRef = db.ref('products');
        const categoriesRef = db.ref('categories');

        const listener = settingsRef.on('value', snapshot => {
            const dataFromFirebase = snapshot.val();
            if (dataFromFirebase) {
                setSettings(mergeDeep({}, getInitialSiteSettings(), dataFromFirebase));
                setActiveThemeForEditing(dataFromFirebase.activeTheme || 'light');
            } else {
                setSettings(getInitialSiteSettings());
            }
        });

        productsRef.on('value', snapshot => setProducts(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));
        categoriesRef.on('value', snapshot => setCategories(snapshot.val() ? Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })) : []));
        
        return () => {
             settingsRef.off('value', listener);
             productsRef.off();
             categoriesRef.off();
        };
    }, []);

    const handleSettingsChange = (path: string, value: any) => {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]] = current[keys[i]] || {};
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };
    
    const handleAdd = (path: string, newItemData: any) => {
        const newId = db.ref().push().key!;
        handleSettingsChange(`${path}.${newId}`, { id: newId, ...newItemData });
    };

    const handleRemove = (path: string) => {
        const keys = path.split('.');
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) return newState; // Path doesn't exist
                current = current[keys[i]];
            }
            delete current[keys[keys.length - 1]];
            return newState;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try { 
            await db.ref('site_settings').update(settings); 
            alert("Settings saved successfully!"); 
        } catch (error) { 
            console.error(error);
            alert("Failed to save settings."); 
        } finally { 
            setLoading(false); 
        }
    };
    
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    const currentThemeColors = settings.themeColors?.[activeThemeForEditing] || {};

    const colorSetColorFields: (keyof ColorSet)[] = [ 'primary', 'bg', 'surface', 'text', 'secondary', 'lightGray', 'shadowRgb', 'buttonTextColor' ];
    const colorSetStringFields: (keyof ColorSet)[] = [ 'buttonTextureUrl', 'surfaceTextureUrl' ];
    const colorSetNumberFields: (keyof ColorSet)[] = [ 'surfaceTextureOpacity' ];

    return (
        <div>
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-serif font-bold text-brand-dark">Theme & Global Settings</h1>
                    <button type="submit" disabled={loading} className="bg-brand-green text-white px-8 py-3 rounded-full font-medium disabled:bg-gray-400">
                        {loading ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
                
                <CollapsibleSection title="Global Site Identity" startsOpen={true}>
                    <div className="space-y-4 max-w-3xl">
                        <div><label className="block text-sm font-medium text-gray-700">Site Title</label><input type="text" value={settings.siteTitle || ''} onChange={e => handleSettingsChange('siteTitle', e.target.value)} className={inputStyle} /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Image URL</label>
                             <div className="flex gap-4">
                               <input type="text" value={settings.logoUrl || ''} onChange={e => handleSettingsChange('logoUrl', e.target.value)} placeholder="Logo URL" className={inputStyle} />
                               <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('logoUrl', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                            </div>
                        </div>
                         <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.useImageForTitle} onChange={e => handleSettingsChange('useImageForTitle', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Use Image instead of Text for Site Title</span></label>
                         {settings.useImageForTitle && <div>
                            <label className="block text-sm font-medium text-gray-700">Site Title Image URL</label>
                             <div className="flex gap-4">
                               <input type="text" value={settings.siteTitleImageUrl || ''} onChange={e => handleSettingsChange('siteTitleImageUrl', e.target.value)} placeholder="Title Image URL" className={inputStyle} />
                               <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange('siteTitleImageUrl', url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Browse</button>
                            </div>
                        </div>}
                    </div>
                </CollapsibleSection>
                
                <CollapsibleSection title="Theme & Colors">
                    <div className="max-w-3xl space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700">Active Site Theme</label><select value={settings.activeTheme || 'light'} onChange={e => handleSettingsChange('activeTheme', e.target.value)} className={inputStyle}>{themes.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}</select></div>
                        <div className="border p-4 rounded-lg space-y-4">
                            <h4 className="font-bold text-lg">Edit Theme Colors</h4>
                            <div className="flex flex-wrap gap-2 border-b pb-4">{themes.map(t => (<button type="button" key={t.name} onClick={() => setActiveThemeForEditing(t.name)} className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${activeThemeForEditing === t.name ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>{t.label}</button>))}</div>
                            <div className="grid grid-cols-1 gap-2">
                                <h5 className="font-semibold text-gray-600 text-sm pt-2">Colors (RGB string or hex)</h5>
                                {colorSetColorFields.map(key => (
                                    <ColorInput key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={(currentThemeColors[key] as string) || ''} onChange={v => handleSettingsChange(`themeColors.${activeThemeForEditing}.${key}`, v)} />
                                ))}
                                <h5 className="font-semibold text-gray-600 text-sm pt-4">Textures & Overlays</h5>
                                {colorSetStringFields.map(key => (
                                    <div key={key} className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] items-center gap-2 py-2 border-b border-gray-100 last:border-b-0">
                                        <label className="text-sm font-medium text-gray-700">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                        <input 
                                            type="text" 
                                            value={(currentThemeColors[key] as string) || ''} 
                                            onChange={e => handleSettingsChange(`themeColors.${activeThemeForEditing}.${key}`, e.target.value)} 
                                            className={inputStyle}
                                            placeholder="Image URL"
                                        />
                                        <button type="button" onClick={() => openImagePicker((url) => handleSettingsChange(`themeColors.${activeThemeForEditing}.${key}`, url))} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">Browse</button>
                                    </div>
                                ))}
                                {colorSetNumberFields.map(key => (
                                    <div key={key} className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-2 py-2 border-b border-gray-100 last:border-b-0">
                                        <label className="text-sm font-medium text-gray-700">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                        <input 
                                            type="number"
                                            step="0.01" min="0" max="1"
                                            value={(currentThemeColors[key] as number) || 0} 
                                            onChange={e => handleSettingsChange(`themeColors.${activeThemeForEditing}.${key}`, Number(e.target.value))} 
                                            className={inputStyle}
                                            placeholder="0 to 1"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>
                 <CollapsibleSection title="Diwali Theme Settings">
                    <div className="max-w-3xl space-y-4">
                        {(Object.keys(settings.diwaliThemeSettings || {}) as (keyof DiwaliThemeSettings)[]).map(key => (
                            <DiwaliOverlayEditor key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} settings={settings.diwaliThemeSettings[key]} onSettingChange={handleSettingsChange} basePath={`diwaliThemeSettings.${key}`} themes={themes} openImagePicker={openImagePicker} />
                        ))}
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Mobile Viewport">
                    <div className="max-w-3xl space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Mobile Viewport Behavior</label>
                        <p className="text-xs text-gray-500">Choose how the site should render on mobile devices. 'Responsive' is standard. 'Force Desktop' will show the desktop layout scaled down, which may impact usability.</p>
                        <select 
                            value={settings.mobileViewport || 'responsive'} 
                            onChange={e => handleSettingsChange('mobileViewport', e.target.value)} 
                            className={inputStyle}
                        >
                            <option value="responsive">Responsive (Recommended)</option>
                            <option value="desktop">Force Desktop View</option>
                        </select>
                    </div>
                </CollapsibleSection>
                <CollapsibleSection title="Footer Settings">
                    <div className="space-y-6 max-w-4xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Footer Description</label>
                            <textarea value={settings.footer?.description || ''} onChange={e => handleSettingsChange('footer.description', e.target.value)} className={`${inputStyle} h-20`}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Copyright Text</label>
                            <input type="text" value={settings.footer?.copyrightText || ''} onChange={e => handleSettingsChange('footer.copyrightText', e.target.value)} className={inputStyle}/>
                        </div>

                        {/* Contact Info */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Contact Info</h4>
                            <input type="tel" value={settings.footer?.contactInfo?.phone || ''} onChange={e => handleSettingsChange('footer.contactInfo.phone', e.target.value)} placeholder="Phone Number" className={inputStyle}/>
                            <input type="email" value={settings.footer?.contactInfo?.email || ''} onChange={e => handleSettingsChange('footer.contactInfo.email', e.target.value)} placeholder="Email Address" className={inputStyle}/>
                            <input type="text" value={settings.footer?.contactInfo?.location || ''} onChange={e => handleSettingsChange('footer.contactInfo.location', e.target.value)} placeholder="Location / Address" className={inputStyle}/>
                            <input type="text" value={settings.footer?.contactInfo?.timing || ''} onChange={e => handleSettingsChange('footer.contactInfo.timing', e.target.value)} placeholder="Business Hours" className={inputStyle}/>
                        </div>

                        {/* Social Links */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Social Media Links</h4>
                            {settings.footer?.socialLinks && Object.values(settings.footer.socialLinks).map((link: SocialLink) => (
                                <div key={link.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                    <select value={link.platform} onChange={e => handleSettingsChange(`footer.socialLinks.${link.id}.platform`, e.target.value)} className={inputStyle}>
                                        <option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="twitter">Twitter</option><option value="youtube">YouTube</option><option value="pinterest">Pinterest</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option>
                                    </select>
                                    <input type="url" value={link.url} onChange={e => handleSettingsChange(`footer.socialLinks.${link.id}.url`, e.target.value)} placeholder="Full URL" className={inputStyle}/>
                                    <button type="button" onClick={() => handleRemove(`footer.socialLinks.${link.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAdd('footer.socialLinks', { platform: 'facebook', url: '' })} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Social Link</button>
                        </div>
                        
                        {/* Footer Columns */}
                        <div className="border p-4 rounded-lg space-y-4">
                            <h4 className="font-semibold text-gray-800">Footer Link Columns</h4>
                            {settings.footer?.columns && Object.values(settings.footer.columns).map((col: FooterColumn) => (
                                <div key={col.id} className="border p-3 rounded-md space-y-3 bg-gray-50/50">
                                    <div className="flex justify-between items-center">
                                        <input type="text" value={col.title} onChange={e => handleSettingsChange(`footer.columns.${col.id}.title`, e.target.value)} placeholder="Column Title" className={`${inputStyle} font-semibold`} />
                                        <button type="button" onClick={() => handleRemove(`footer.columns.${col.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2 border-t pt-2">
                                        <h5 className="font-semibold text-sm text-gray-600">Links</h5>
                                        {col.links && Object.values(col.links).map((link: NavLink) => (
                                            <div key={link.id} className="border p-2 rounded bg-white space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 items-center">
                                                    <input type="text" value={link.text} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.text`, e.target.value)} placeholder="Link Text" className={inputStyle}/>
                                                    <select value={link.icon || 'none'} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.icon`, e.target.value)} className={inputStyle}>
                                                        <option value="none">No Icon</option><option value="phone">Phone</option><option value="mail">Email</option><option value="cart">Cart</option><option value="arrowRight">Arrow</option>
                                                    </select>
                                                    <button type="button" onClick={() => handleRemove(`footer.columns.${col.id}.links.${link.id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <select value={link.linkType} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.linkType`, e.target.value)} className={inputStyle}>
                                                        <option value="internal">Internal Page</option><option value="external">External Link</option><option value="product">Product</option><option value="category">Category</option>
                                                    </select>
                                                    <div>
                                                        {link.linkType === 'internal' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.link`, e.target.value)} className={inputStyle} placeholder="e.g. shop, cart"/>}
                                                        {link.linkType === 'external' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.link`, e.target.value)} className={inputStyle} placeholder="https://..."/>}
                                                        {link.linkType === 'product' && <select value={link.link} onChange={e => handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}
                                                        {link.linkType === 'category' && <select value={link.link?.split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id===e.target.value); handleSettingsChange(`footer.columns.${col.id}.links.${link.id}.link`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => handleAdd(`footer.columns.${col.id}.links`, { text: 'New Link', linkType: 'internal', link: '' })} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Link</button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAdd('footer.columns', { title: 'New Column', links: {} })} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Column</button>
                        </div>
                    </div>
                </CollapsibleSection>
                 <CollapsibleSection title="Announcement Bar">
                     <div className="space-y-4 max-w-3xl">
                         <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.announcementBar?.enabled} onChange={e => handleSettingsChange('announcementBar.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable Announcement Bar</span></label>
                         {settings.announcementBar?.enabled && <div className="space-y-4">
                            <input type="text" value={settings.announcementBar.text} onChange={e=>handleSettingsChange('announcementBar.text', e.target.value)} placeholder="Announcement Text" className={inputStyle} />
                         </div>}
                     </div>
                </CollapsibleSection>
            </form>
        </div>
    );
};

const ImagePickerModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (url: string) => void;
}> = ({ isOpen, onClose, onImageSelect }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'gallery'>('upload');
    const [galleryImages, setGalleryImages] = useState<{id: string, url: string}[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'gallery') {
            setLoadingGallery(true);
            const imagesRef = db.ref('uploaded_images').orderByChild('uploadedAt');
            const listener = imagesRef.on('value', snapshot => {
                const data = snapshot.val();
                const imageList = data ? Object.keys(data).map(key => ({ id: key, url: data[key].url })).reverse() : [];
                setGalleryImages(imageList);
                setLoadingGallery(false);
            });
            return () => imagesRef.off('value', listener);
        }
    }, [isOpen, activeTab]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploading(true);
            try {
                const url = await uploadAndSaveFile(file);
                onImageSelect(url);
            } catch (error) {
                alert('Image upload failed. Please try again or use a URL.');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleUrlSubmit = async () => {
        if (urlInput) {
            await saveImageUrlToGallery(urlInput);
            onImageSelect(urlInput);
        }
    };
    
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-up">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="p-4 flex justify-between items-center border-b">
                    <h3 className="text-xl font-bold">Select an Image</h3>
                    <button onClick={onClose}><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="flex border-b">
                    <button onClick={() => setActiveTab('upload')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-brand-green text-brand-green' : 'text-gray-500 hover:text-gray-700'}`}>Upload File</button>
                    <button onClick={() => setActiveTab('url')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'url' ? 'border-b-2 border-brand-green text-brand-green' : 'text-gray-500 hover:text-gray-700'}`}>From URL</button>
                    <button onClick={() => setActiveTab('gallery')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'gallery' ? 'border-b-2 border-brand-green text-brand-green' : 'text-gray-500 hover:text-gray-700'}`}>My Uploads</button>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg">
                             <input type="file" id="image-upload-input" accept="image/*" onChange={handleImageUpload} className="hidden"/>
                             <label htmlFor="image-upload-input" className="cursor-pointer text-center p-8">
                                <p className="text-gray-500 mb-2">Drag and drop a file or</p>
                                <span className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium">Browse Files</span>
                             </label>
                             {uploading && <p className="mt-4 text-sm text-gray-600">Uploading...</p>}
                        </div>
                    )}
                    {activeTab === 'url' && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full max-w-md p-2 border border-gray-300 rounded-md"/>
                            <button onClick={handleUrlSubmit} className="mt-4 px-6 py-2 bg-brand-green text-white rounded-md hover:bg-opacity-90 font-medium">Use Image</button>
                        </div>
                    )}
                    {activeTab === 'gallery' && (
                        <div>
                            {loadingGallery ? <p>Loading gallery...</p> : (
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                    {galleryImages.map(img => (
                                        <button key={img.id} onClick={() => onImageSelect(img.url)} className="aspect-square border-2 border-transparent hover:border-brand-green rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-green">
                                            <img src={img.url} alt="Uploaded" className="w-full h-full object-cover"/>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const AdminDashboard: FC = () => {
    const { userProfile } = useAuth();
    const { navigate } = useNavigation();
    const [activeTab, setActiveTab] = useState('products');
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [imagePickerCallback, setImagePickerCallback] = useState<((url: string) => void) | null>(null);

    useEffect(() => {
        if (!userProfile || userProfile.role !== 'admin') {
            navigate('home');
        }
    }, [userProfile, navigate]);
    
    const openImagePicker = (callback: (url: string) => void) => {
        setImagePickerCallback(() => callback);
        setIsImagePickerOpen(true);
    };

    const handleImageSelect = (url: string) => {
        if (imagePickerCallback) {
            imagePickerCallback(url);
        }
        setIsImagePickerOpen(false);
        setImagePickerCallback(null);
    };

    if (!userProfile || userProfile.role !== 'admin') {
        return <div className="py-40 text-center">Redirecting...</div>;
    }

    const tabs = [
        { id: 'products', label: 'Products' },
        { id: 'categories', label: 'Categories' },
        { id: 'users', label: 'Users' },
        { id: 'homepage', label: 'Homepage' },
        { id: 'pages', label: 'Page Settings' },
        { id: 'theme', label: 'Theme & Global' },
    ];

    const renderActiveTab = () => {
        switch(activeTab) {
            case 'products': return <ProductsManager openImagePicker={openImagePicker} />;
            case 'categories': return <CategoriesManager openImagePicker={openImagePicker} />;
            case 'users': return <UsersManager />;
            case 'homepage': return <HomepageSettingsManager openImagePicker={openImagePicker} />;
            case 'pages': return <PageSettingsManager openImagePicker={openImagePicker} />;
            case 'theme': return <ThemeAndGlobalSettingsManager openImagePicker={openImagePicker} />;
            default: return null;
        }
    };

    return (
        <section className="bg-gray-100 min-h-screen">
             <ImagePickerModal 
                isOpen={isImagePickerOpen}
                onClose={() => setIsImagePickerOpen(false)}
                onImageSelect={handleImageSelect}
             />
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white p-4 rounded-lg shadow-md mb-8">
                    <div className="flex space-x-4 border-b overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-brand-green text-brand-green' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                {renderActiveTab()}
            </div>
        </section>
    );
};

export default AdminDashboard;