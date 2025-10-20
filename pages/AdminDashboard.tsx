import React, { useEffect, useState, FC, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { db } from '../firebase';
import { Product, User, Category, HeroSettings, SubCategory, SocialLink, ContactInfo, PosterSlide, OfferSectionSettings, ImageScrollerSettings, QnA, Tag, ProductVariant, HighlightedNoteSettings, FooterSettings, NavLink, FooterColumn, ActionButtonSettings, ProductPageSettings, Author, TestimonialsSettings, Theme, DiwaliThemeSettings, ThemeColors, ColorSet, DiwaliOverlaySetting, DecorativeOverlay, FloatingDecoration, HeaderOverlapImageSettings, ShopPageSettings, BottomBlendSettings, BestsellerListSettings, CategoryCardSettings } from '../types';
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
const AddEditProductModal: FC<{ isOpen: boolean, onClose: () => void, productToEdit: Product | null, categories: Category[] }> = ({ isOpen, onClose, productToEdit, categories }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [qna, setQna] = useState<QnA[]>([]);
    const [loading, setLoading] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // States for sub-forms (tags, variants, qna)
    const [tagInput, setTagInput] = useState({ text: '', color: '#6B7F73' });
    const [variantInput, setVariantInput] = useState({ name: '', price: 0, oldPrice: 0, stock: 10 });
    const [qnaInput, setQnaInput] = useState({ question: '', answer: '' });

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
            setFormData({ name: '', price: 0, stock: 10, category: categories[0]?.name || '', subcategory: '', description: '', images: [], tags: {}, variants: {}, isPopular: false, isVisible: true, hasCustomOverlay: false });
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

    const addImageUrl = () => {
        if (newImageUrl && !imageUrls.includes(newImageUrl)) {
            setImageUrls(prev => [newImageUrl, ...prev]);
            setNewImageUrl('');
        }
    };
    
    const removeImageUrl = (url: string) => {
        setImageUrls(prev => prev.filter(u => u !== url));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const newUrl = await uploadFile(e.target.files![0]);
                setImageUrls(prev => [newUrl, ...prev]);
            } catch (error) { alert("Image upload failed."); } 
            finally { setUploading(false); e.target.value = ''; }
        }
    };

    const handleSubFormAdd = (type: 'tags' | 'variants' | 'qna') => {
        if (type === 'tags' && tagInput.text) {
            const newId = db.ref().push().key!;
            setFormData(p => ({ ...p, tags: { ...p.tags, [newId]: tagInput } }));
            setTagInput({ text: '', color: '#6B7F73' });
        }
        if (type === 'variants' && variantInput.name) {
             const newId = db.ref().push().key!;
             setFormData(p => ({ ...p, variants: { ...p.variants, [newId]: variantInput } }));
             setVariantInput({ name: '', price: 0, oldPrice: 0, stock: 10 });
        }
        if (type === 'qna' && qnaInput.question && qnaInput.answer) {
            const newId = db.ref().push().key!;
            setQna(prev => [...prev, { ...qnaInput, id: newId }]);
            setQnaInput({ question: '', answer: '' });
        }
    };

    const handleSubFormRemove = (type: 'tags' | 'variants' | 'qna', id: string) => {
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
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center"><h3 className="text-xl font-bold">{productToEdit ? 'Edit Product' : 'Add New Product'}</h3><button type="button" onClick={onClose}><XIcon className="w-6 h-6"/></button></div>
                    <input name="name" type="text" placeholder="Product Name" value={formData.name || ''} onChange={handleChange} className={inputStyle}/>
                    <div className="p-4 border rounded-lg space-y-2"> {/* Images */}
                        <label className="block text-sm font-medium text-gray-700">Images</label>
                        <div className="flex items-center space-x-2"><input type="text" placeholder="Paste Image URL" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} className={`${inputStyle} flex-grow`}/><button type="button" onClick={addImageUrl} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add URL</button></div>
                        <div className="text-center text-sm text-gray-500">OR</div>
                        <div><label htmlFor="product-image-upload" className={`w-full text-center cursor-pointer block p-2 border-2 border-dashed rounded-lg ${uploading ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>{uploading ? 'Uploading...' : 'Upload an Image'}</label><input id="product-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading}/></div>
                        <div className="mt-2 flex flex-wrap gap-2">{imageUrls.map((url, i) => (<div key={i} className="relative"><img src={url} className="w-20 h-20 object-cover rounded"/><button type="button" onClick={() => removeImageUrl(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button></div>))}</div>
                    </div>
                    <textarea name="description" placeholder="Description (HTML is supported)" value={formData.description || ''} onChange={handleChange} className={inputStyle} rows={3}/>
                    <div className="grid grid-cols-3 gap-4">
                        <input name="price" type="number" step="0.01" placeholder="Price" value={formData.price ?? ''} onChange={handleChange} className={inputStyle}/>
                        <input name="oldPrice" type="number" step="0.01" placeholder="Old Price (Optional)" value={formData.oldPrice || ''} onChange={handleChange} className={inputStyle}/>
                        <input name="stock" type="number" placeholder="Stock Quantity" value={formData.stock ?? ''} onChange={handleChange} className={inputStyle}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="category" value={formData.category || ''} onChange={handleChange} className={inputStyle}><option value="" disabled>Select a category</option>{categories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}</select>
                         {availableSubcategories.length > 0 && (<select name="subcategory" value={formData.subcategory || ''} onChange={handleChange} className={inputStyle}><option value="">Select subcategory (optional)</option>{availableSubcategories.map(sub => (<option key={sub.id} value={sub.name}>{sub.name}</option>))}</select>)}
                    </div>
                    <div className="p-4 border rounded-lg space-y-3"> {/* Tags */}
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <div className="flex items-center space-x-2"><input type="text" placeholder="Tag Text" value={tagInput.text} onChange={e => setTagInput(p=>({...p, text: e.target.value}))} className={inputStyle} /><input type="color" value={tagInput.color} onChange={e => setTagInput(p=>({...p, color: e.target.value}))} className={`${inputStyle} h-10 p-1 w-16 cursor-pointer`} /><button type="button" onClick={() => handleSubFormAdd('tags')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add</button></div>
                        <div className="flex flex-wrap gap-2">{formData.tags && Object.entries(formData.tags).map(([id, tag]: [string, any]) => (<div key={id} className="text-white text-sm font-medium pl-3 pr-2 py-1 rounded-full flex items-center" style={{backgroundColor: tag.color}}>{tag.text}<button type="button" onClick={() => handleSubFormRemove('tags', id)} className="ml-2 text-white/70 hover:text-white"><XIcon className="w-3 h-3"/></button></div>))}</div>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3"> {/* Variants */}
                        <label className="block text-sm font-medium text-gray-700">Variants (Optional)</label>
                        <div className="grid grid-cols-5 gap-2"><input type="text" placeholder="Name (e.g., 50ml)" value={variantInput.name} onChange={e => setVariantInput(p=>({...p, name: e.target.value}))} className={inputStyle}/><input type="number" placeholder="Price" value={variantInput.price} onChange={e => setVariantInput(p=>({...p, price: Number(e.target.value)}))} className={inputStyle}/><input type="number" placeholder="Old Price" value={variantInput.oldPrice} onChange={e => setVariantInput(p=>({...p, oldPrice: Number(e.target.value)}))} className={inputStyle}/><input type="number" placeholder="Stock" value={variantInput.stock} onChange={e => setVariantInput(p=>({...p, stock: Number(e.target.value)}))} className={inputStyle}/><button type="button" onClick={() => handleSubFormAdd('variants')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add</button></div>
                        <div className="space-y-1">{formData.variants && Object.entries(formData.variants).map(([id, v]: [string, any]) => (<div key={id} className="flex items-center gap-2 text-sm"><span className="font-semibold w-1/4">{v.name}</span><span className="w-1/4">₹{v.price}</span><span className="w-1/4">Stock: {v.stock}</span><button type="button" onClick={() => handleSubFormRemove('variants', id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button></div>))}</div>
                    </div>
                     <div className="p-4 border rounded-lg space-y-3"> {/* Q&A */}
                        <label className="block text-sm font-medium text-gray-700">Questions & Answers</label>
                        {qna.map((item, index) => (<div key={item.id} className="text-sm border-b pb-2"><p><strong className="font-semibold">Q:</strong> {item.question}</p><p><strong className="font-semibold">A:</strong> {item.answer}</p><button type="button" onClick={() => handleSubFormRemove('qna', item.id)} className="text-xs text-red-500 hover:underline">Remove</button></div>))}
                        <input type="text" placeholder="Question" value={qnaInput.question} onChange={e => setQnaInput(p=>({...p, question: e.target.value}))} className={inputStyle}/>
                        <textarea placeholder="Answer" value={qnaInput.answer} onChange={e => setQnaInput(p=>({...p, answer: e.target.value}))} className={inputStyle} rows={2}/>
                        <button type="button" onClick={() => handleSubFormAdd('qna')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm">Add Q&A</button>
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

const ProductsManager: FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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


    return (
        <div>
            <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-serif font-bold text-brand-dark">Products ({products.length})</h1><button onClick={openAddModal} className="bg-brand-green text-white px-5 py-2 rounded-full font-medium hover:bg-opacity-90 flex items-center space-x-2 shadow-sm transition-transform hover:scale-105"><PlusIcon className="w-5 h-5"/><span>Add New Product</span></button></div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th><th scope="col" className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th><th scope="col" className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visible</th><th scope="col" className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Popular</th><th scope="col" className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{products.map(product => (<tr key={product.id} className={`${product.isVisible === false ? 'bg-gray-50 opacity-60' : ''}`}><td className="py-4 px-6"><img src={product.images?.[0]} alt={product.name} className="w-12 h-12 object-cover rounded-md"/></td><td className="py-4 px-6 font-medium whitespace-nowrap text-gray-900">{product.name}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">₹{(product.price).toFixed(2)}</td><td className="py-4 px-6 whitespace-nowrap text-gray-600">{product.stock}</td><td className="py-4 px-6 text-center"><label htmlFor={`visible-toggle-${product.id}`} className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id={`visible-toggle-${product.id}`} className="sr-only peer" checked={product.isVisible !== false} onChange={() => handleToggle(product, 'isVisible')} /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div></label></td><td className="py-4 px-6 text-center"><label htmlFor={`popular-toggle-${product.id}`} className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id={`popular-toggle-${product.id}`} className="sr-only peer" checked={!!product.isPopular} onChange={() => handleToggle(product, 'isPopular')} /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div></label></td><td className="py-4 px-6 space-x-2 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => openEditModal(product)} className="text-brand-green hover:text-brand-dark">Edit</button><button onClick={() => openDeleteModal(product)} className="text-red-600 hover:text-red-800">Delete</button></td></tr>))}</tbody></table></div>
            <AddEditProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} productToEdit={productToEdit} categories={categories} />
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`} />
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
const AddEditCategoryModal: FC<{ isOpen: boolean, onClose: () => void, categoryToEdit: Category | null }> = ({ isOpen, onClose, categoryToEdit }) => {
    const [formData, setFormData] = useState<Partial<Category>>({ name: '', image: '', subcategories: [] });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [subcatInput, setSubcatInput] = useState('');

    useEffect(() => {
        setFormData(categoryToEdit || { name: '', image: '', subcategories: [] });
    }, [categoryToEdit, isOpen]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            try {
                const imageUrl = await uploadFile(e.target.files[0]);
                setFormData(p => ({...p, image: imageUrl}));
            } catch (err) { alert('Image upload failed'); }
            finally { setUploading(false); }
        }
    }
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
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                    {uploading && <p className="text-xs text-blue-500 mt-1">Uploading image...</p>}
                    <button type="button" onClick={()=>setFormData(p=>({...p, image: ''}))} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
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

const CategoriesManager: FC = () => {
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
            <AddEditCategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categoryToEdit={categoryToEdit} />
            <ConfirmationModal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} onConfirm={handleDelete} title="Delete Category" message={`Are you sure you want to delete "${categoryToDelete?.name}"?`} />
        </div>
    );
};


// --- Homepage Settings Component ---
const HeroPreview: FC<{ settings: Partial<HeroSettings> }> = ({ settings }) => {
    if (!settings) return null;
    return (
        <div className="mt-4 border p-4 rounded-lg relative">
            <h3 className="text-sm font-semibold mb-2">Live Preview</h3>
            <div className="relative pt-12 pb-12 flex items-center min-h-[250px] rounded-md overflow-hidden">
                {settings.image && <img src={settings.image} alt="preview" className="absolute inset-0 w-full h-full object-cover"/>}
                <div className="absolute inset-0" style={{ backgroundColor: settings.overlayColor || 'rgba(255, 255, 255, 0.5)' }}></div>
                <div className="relative max-w-xl mx-auto px-4 w-full">
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

const getInitialHomepageSettings = () => ({
    productShowcaseImage: '',
    productShowcaseText: '',
    shopByCategoryTitle: 'Shop by Category',
    categoryCardSettings: {
        height: '384px', borderRadiusTop: '150px', borderRadiusBottom: '12px',
        decorationIcon: 'sparkle', customDecorationIconUrl: '',
        decorationIconSize: 32, decorationIconColor: '#6B7F73', frameImageUrl: ''
    } as CategoryCardSettings,
    heroSection: {} as Partial<HeroSettings>,
    usageSection: { enabled: true, title: '', subtitle: '', box1Text: '', box2Text: '', image: '' },
    imageScroller: { enabled: false, slides: {}, slideSize: 'medium' } as ImageScrollerSettings,
    offerSections: {} as { [key: string]: OfferSectionSettings },
    bestsellerLists: {} as { [key: string]: BestsellerListSettings },
    highlightedNote: { enabled: false, title: '', text: '', backgroundColor: '#F8F7F4', textColor: '#333333' } as HighlightedNoteSettings,
    testimonials: { enabled: false, title: 'What Our Customers Say', authors: {} } as TestimonialsSettings,
    decorativeOverlays: {} as { hero?: DecorativeOverlay, productShowcase?: DecorativeOverlay },
});

const HomepageSettingsManager: FC = () => {
    const [settings, setSettings] = useState(getInitialHomepageSettings());
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [overlayOpacity, setOverlayOpacity] = useState(50);

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(field);
            try { handleSettingsChange(field, await uploadFile(e.target.files[0])); } 
            catch (error) { alert("Image upload failed."); } 
            finally { setUploading(null); }
        }
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

    const focusPointOptions = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center"><h1 className="text-3xl font-serif font-bold text-brand-dark">Homepage Settings</h1><button type="submit" disabled={loading || !!uploading} className="bg-brand-green text-white px-8 py-3 rounded-full font-medium disabled:bg-gray-400">{loading ? 'Saving...' : (uploading ? `Uploading...` : 'Save Homepage Settings')}</button></div>

                <CollapsibleSection title="Hero Section (Top Banner)" startsOpen={true}>
                    <div className="space-y-4 max-w-3xl"><div><label className="block text-sm font-medium text-gray-700">Background Image</label>{settings.heroSection?.image && <img src={settings.heroSection.image} alt="Hero preview" className="w-full h-48 object-cover rounded-md my-2 border bg-gray-100" />}<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'heroSection.image')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" /><input type="text" value={settings.heroSection?.image || ''} onChange={e => handleSettingsChange('heroSection.image', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Or paste image URL" /><button type="button" onClick={()=>handleSettingsChange('heroSection.image', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button></div><div><label className="block text-sm font-medium text-gray-700">Image Overlay Opacity (White)</label><div className="flex items-center space-x-4"><input type="range" min="0" max="100" value={overlayOpacity} onChange={handleOpacityChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /><span className="text-sm text-gray-600">{overlayOpacity}%</span></div></div>
                    
                    <div className="p-3 border rounded-lg space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Image Styling</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold mb-2">Desktop</h4>
                                <label className="block text-xs font-medium text-gray-600">Zoom ({settings.heroSection?.imageStyles?.desktop?.zoom || 100}%)</label>
                                <input type="range" min="100" max="200" value={settings.heroSection?.imageStyles?.desktop?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.zoom', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus Point</label>
                                <select value={settings.heroSection?.imageStyles?.desktop?.focusPoint || 'center'} onChange={e => handleSettingsChange('heroSection.imageStyles.desktop.focusPoint', e.target.value)} className={inputStyle} >{focusPointOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Mobile</h4>
                                <label className="block text-xs font-medium text-gray-600">Zoom ({settings.heroSection?.imageStyles?.mobile?.zoom || 100}%)</label>
                                <input type="range" min="100" max="200" value={settings.heroSection?.imageStyles?.mobile?.zoom || 100} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.zoom', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                                <label className="block text-xs font-medium text-gray-600 mt-2">Focus Point</label>
                                <select value={settings.heroSection?.imageStyles?.mobile?.focusPoint || 'center'} onChange={e => handleSettingsChange('heroSection.imageStyles.mobile.focusPoint', e.target.value)} className={inputStyle} >{focusPointOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
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
                                <option value="none">No Link</option><option value="internal">Internal Page</option><option value="external">External URL</option><option value="product">Product</option><option value="category">Category</option>
                            </select>
                             <div>
                                {settings.heroSection.buttonLinkType === 'internal' && <input type="text" value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop" />}
                                {settings.heroSection.buttonLinkType === 'external' && <input type="text" value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle} placeholder="https://..." />}
                                {settings.heroSection.buttonLinkType === 'product' && <select value={settings.heroSection.buttonLink || ''} onChange={e => handleSettingsChange(`heroSection.buttonLink`, e.target.value)} className={inputStyle}><option value="">-- Select Product --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}
                                {settings.heroSection.buttonLinkType === 'category' && <select value={(settings.heroSection.buttonLink || '').split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id === e.target.value); handleSettingsChange(`heroSection.buttonLink`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select Category --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}
                            </div>
                         </div>
                    </div>
                    <HeroPreview settings={settings.heroSection} /></div>
                </CollapsibleSection>

                <CollapsibleSection title="Decorative Overlays (Frames, etc.)">
                    <div className="max-w-3xl space-y-6">
                        <p className="text-sm text-gray-500">Add decorative PNG images (like frames or stars) on top of major site sections. Use transparent PNGs for the best effect.</p>
                        {/* Hero Overlay */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Hero Section Overlay</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Overlay Image</label>
                                {settings.decorativeOverlays?.hero?.url && <img src={settings.decorativeOverlays.hero.url} alt="Hero overlay preview" className="w-full h-32 object-contain rounded-md my-2 border bg-gray-100 p-2" />}
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'decorativeOverlays.hero.url')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                                <input type="text" value={settings.decorativeOverlays?.hero?.url || ''} onChange={e => handleSettingsChange('decorativeOverlays.hero.url', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Or paste image URL" />
                                <button type="button" onClick={() => handleSettingsChange('decorativeOverlays.hero.url', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings.decorativeOverlays?.hero?.opacity ?? 1) * 100)}%)</label>
                                <input type="range" min="0" max="100" value={(settings.decorativeOverlays?.hero?.opacity ?? 1) * 100} onChange={e => handleSettingsChange('decorativeOverlays.hero.opacity', Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                        {/* Product Showcase Overlay */}
                        <div className="border p-4 rounded-lg space-y-3">
                            <h4 className="font-semibold text-gray-800">Product Showcase Overlay</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Overlay Image</label>
                                {settings.decorativeOverlays?.productShowcase?.url && <img src={settings.decorativeOverlays.productShowcase.url} alt="Showcase overlay preview" className="w-full h-32 object-contain rounded-md my-2 border bg-gray-100 p-2" />}
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'decorativeOverlays.productShowcase.url')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                                <input type="text" value={settings.decorativeOverlays?.productShowcase?.url || ''} onChange={e => handleSettingsChange('decorativeOverlays.productShowcase.url', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Or paste image URL" />
                                <button type="button" onClick={() => handleSettingsChange('decorativeOverlays.productShowcase.url', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
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
                                    <input type="text" value={settings.categoryCardSettings?.frameImageUrl || ''} onChange={e => handleSettingsChange('categoryCardSettings.frameImageUrl', e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'categoryCardSettings.frameImageUrl')} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
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
                                        <input type="text" value={settings.categoryCardSettings?.customDecorationIconUrl || ''} onChange={e => handleSettingsChange('categoryCardSettings.customDecorationIconUrl', e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'categoryCardSettings.customDecorationIconUrl')} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
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
                                               <input
                                                   type="text"
                                                   value={author.image}
                                                   onChange={e => handleSettingsChange(`testimonials.authors.${id}.image`, e.target.value)}
                                                   placeholder="Image URL"
                                                   className={inputStyle}
                                               />
                                               <input
                                                   type="file" accept="image/*"
                                                   onChange={e => handleImageUpload(e, `testimonials.authors.${id}.image`)}
                                                   className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                               />
                                               <input
                                                   type="text"
                                                   value={author.name}
                                                   onChange={e => handleSettingsChange(`testimonials.authors.${id}.name`, e.target.value)}
                                                   placeholder="Author Name"
                                                   className={inputStyle}
                                               />
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
                                    {settings.usageSection.image && <img src={settings.usageSection.image} alt="Usage section preview" className="w-48 h-auto object-cover rounded-md my-2 border bg-gray-100" />}
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'usageSection.image')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                                    <input type="text" value={settings.usageSection.image || ''} onChange={e => handleSettingsChange('usageSection.image', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Or paste image URL" />
                                    <button type="button" onClick={() => handleSettingsChange('usageSection.image', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                 <CollapsibleSection title="Auto-Scrolling Posters">
                     <div className="max-w-3xl space-y-4">{/* Image Scroller */}
                        <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={settings.imageScroller?.enabled || false} onChange={e => handleSettingsChange('imageScroller.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this section</span></label>
                         {settings.imageScroller?.enabled && <div className="space-y-4 mt-4">{settings.imageScroller.slides && Object.entries(settings.imageScroller.slides).map(([id, slide]: [string, any]) => (<div key={id} className="border p-3 rounded-md space-y-2"><div className="flex items-start gap-4"><div className="w-1/3"><label className="block text-sm font-medium text-gray-700 mb-1">Poster Image</label><img src={slide.image || 'https://via.placeholder.com/150x200'} alt="poster" className="w-full aspect-[3/4] object-cover rounded border bg-gray-100" /></div><div className="w-2/3 space-y-2"><input type="text" value={slide.image} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.image`, e.target.value)} placeholder="Image URL" className={inputStyle} /><input type="file" onChange={e => handleImageUpload(e, `imageScroller.slides.${id}.image`)} className="text-sm w-full"/><input type="text" value={slide.altText} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.altText`, e.target.value)} placeholder="Alt Text" className={inputStyle} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center"><select value={slide.linkType} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.linkType`, e.target.value)} className={inputStyle}><option value="none">No Link</option><option value="internal">Internal Page</option><option value="external">External URL</option><option value="product">Product</option><option value="category">Category</option></select><div>{slide.linkType === 'internal' && <input type="text" value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop" />}{slide.linkType === 'external' && <input type="text" value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle} placeholder="https://..." />}{slide.linkType === 'product' && <select value={slide.link} onChange={e => handleSettingsChange(`imageScroller.slides.${id}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}{slide.linkType === 'category' && <select value={slide.link?.split(':')[0]} onChange={e => { const cat = categories.find(c=>c.id===e.target.value); handleSettingsChange(`imageScroller.slides.${id}.link`, `${cat?.id}:${cat?.name}`);}} className={inputStyle}><option value="">-- Select --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}</div></div><button type="button" onClick={() => handleRemove(`imageScroller.slides.${id}`)} className="text-sm text-red-600 hover:underline">Remove Slide</button></div>))}<button type="button" onClick={() => handleAdd('imageScroller.slides', { image: '', linkType: 'none', link: '' })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Slide</button></div>}
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
                            <input type="text" value={section.titleImageUrl || ''} onChange={e => handleSettingsChange(`offerSections.${section.id}.titleImageUrl`, e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, `offerSections.${section.id}.titleImageUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                            {section.titleImageUrl && <button type="button" onClick={() => handleSettingsChange(`offerSections.${section.id}.titleImageUrl`, '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>}
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
                                        <input type="text" value={section.decorationImageUrl || ''} onChange={e => handleSettingsChange(`offerSections.${section.id}.decorationImageUrl`, e.target.value)} className={inputStyle} placeholder="Image URL (optional)" />
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, `offerSections.${section.id}.decorationImageUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
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

                 {/* Other sections with image remove buttons */}
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
                <div><label className="block text-sm font-medium">Action / Link Type</label><select value={settings.linkType || 'default'} onChange={e => { onChange(`${path}.link`, ''); onChange(`${path}.linkType`, e.target.value); }} className={inputStyle}><option value="default">Default E-commerce Action</option><option value="internal">Internal Page</option><option value="external">External URL</option><option value="product">Product</option><option value="category">Category</option><option value="phone">Phone Number</option><option value="email">Email Address</option></select></div>
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
}> = ({ label, settings, onSettingChange, basePath, themes }) => {
    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if(e.target.files?.[0]){ try{ onSettingChange(field, await uploadFile(e.target.files[0])); } catch { alert("Upload failed.")}}
    }

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
                        <input type="text" placeholder="Image URL for light theme" value={settings?.url || ''} onChange={e => onSettingChange(`${basePath}.url`, e.target.value)} className={inputStyle} />
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `${basePath}.url`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Image (Dark Theme)</label>
                        <input type="text" placeholder="Image URL for dark theme" value={settings?.darkUrl || ''} onChange={e => onSettingChange(`${basePath}.darkUrl`, e.target.value)} className={inputStyle} />
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `${basePath}.darkUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
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

const getInitialThemeSettings = () => ({
    siteTitle: 'AURASHKA', 
    logoUrl: '', 
    siteTitleImageUrl: '', 
    useImageForTitle: false, 
    activeTheme: 'light' as Theme, 
    themeColors: {light:{}, dark:{}, blue:{}, diwali:{}, 'diwali-dark': {}} as Partial<ThemeColors>, 
    header: { navLinks: {} as { [key: string]: NavLink } }, 
    footer: { description: '', copyrightText: '', columns: {}, newsletter: { title: '', subtitle: '' }, contactInfo: {}, socialLinks: {}, socialIconSize: 24 } as Partial<FooterSettings>, 
    productPage: { shippingReturnsInfo: '', buttons: { addToCart: {}, buyNow: {} } } as Partial<ProductPageSettings>, 
    diwaliThemeSettings: {} as DiwaliThemeSettings, 
    floatingDecorations: {} as { [key: string]: FloatingDecoration }, 
    searchPage: { title: 'Search Our Products' }, 
    enableGlobalCardOverlay: false,
    mobileViewport: 'responsive' as 'responsive' | 'desktop',
    shopPage: { title: 'Our Products', subtitle: 'Discover our curated collection of nature-inspired beauty essentials.' } as ShopPageSettings,
    headerOverlapImage: { enabled: false, imageUrl: '', opacity: 1, position: 'full', width: '100%', height: '150px', top: '0px', zIndex: 25 } as HeaderOverlapImageSettings,
    bottomBlend: { enabled: false, imageUrl: '', darkImageUrl: '', opacity: 0.5, height: '350px', displayOnThemes: {} } as BottomBlendSettings,
});


const ThemeSettingsManager: FC = () => {
    const [settings, setSettings] = useState(getInitialThemeSettings());
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    useEffect(() => {
        const settingsRef = db.ref('site_settings');

        const listener = settingsRef.on('value', snapshot => {
            const dataFromFirebase = snapshot.val();
            if (dataFromFirebase) {
                setSettings(mergeDeep({}, getInitialThemeSettings(), dataFromFirebase));
            } else {
                setSettings(getInitialThemeSettings());
            }
        });
        db.ref('products').on('value', s => setProducts(s.val() ? Object.keys(s.val()).map(k=>({id:k,...s.val()[k]})) : []));
        db.ref('categories').on('value', s => setCategories(s.val() ? Object.keys(s.val()).map(k=>({id:k,...s.val()[k]})) : []));
        return () => { settingsRef.off('value', listener); db.ref('products').off(); db.ref('categories').off(); };
    }, []);

    const handleSettingsChange = (path: string, value: any) => {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); let current = newState; const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]] = current[keys[i]] || {};
            current[keys[keys.length - 1]] = value; return newState;
        });
    };
    const handleAdd = (path: string, defaultData = {}) => {
        const newId = db.ref().push().key!;
        let newItem;
        if (path.includes('columns')) newItem = { id: newId, title: 'New Column', links: {} };
        else if (path.includes('socialLinks')) newItem = { id: newId, platform: 'facebook', url: 'https://facebook.com' };
        else if (path.includes('floatingDecorations')) newItem = { id: newId, ...defaultData };
        else newItem = { id: newId, text: 'New Link', linkType: 'internal', link: 'home' };
        handleSettingsChange(`${path}.${newId}`, newItem);
    };
    const handleRemove = (path: string) => {
        const keys = path.split('.');
        const parentPath = keys.slice(0, -1).join('/');
        const childKey = keys[keys.length - 1];
        db.ref(`site_settings/${parentPath}/${childKey}`).remove();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await db.ref('site_settings').update(settings); alert("Theme settings saved!"); } 
        catch (error) { alert("Failed to save settings."); } finally { setLoading(false); }
    };
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if(e.target.files?.[0]){ try{ handleSettingsChange(field, await uploadFile(e.target.files[0])); } catch { alert("Upload failed.")}}
    }
    
    const handleThemeLinkChange = (path: string, theme: Theme, isChecked: boolean) => {
        const currentThemes = settings.header?.navLinks[path.split('.').pop()!]?.displayThemes || { light: true, dark: true, blue: true, diwali: true };
        const newThemes = { ...currentThemes, [theme]: isChecked };
        handleSettingsChange(`${path}.displayThemes`, newThemes);
    };


    const inputStyle = "w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green";
    
    const colorProperties: { key: keyof ColorSet; label: string }[] = [
        { key: 'primary', label: 'Primary' }, { key: 'bg', label: 'Background' },
        { key: 'surface', label: 'Surface (Cards)' }, { key: 'text', label: 'Main Text' },
        { key: 'secondary', label: 'Secondary Text' }, { key: 'lightGray', label: 'Light Gray/Accent' },
        { key: 'shadowRgb', label: 'Shadow Color (RGB)' }
    ];

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center"><h1 className="text-3xl font-serif font-bold text-brand-dark">Theme Settings</h1><button type="submit" disabled={loading} className="bg-brand-green text-white px-8 py-3 rounded-full font-medium disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Theme Settings'}</button></div>
                
                <CollapsibleSection title="Active Site Theme" startsOpen={true}>
                    <div className="max-w-3xl space-y-2">
                        <p className="text-sm text-gray-600">Select the theme that will be active for all users visiting the site.</p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            {themes.map(t => (
                                <label key={t.name} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-brand-green/10 has-[:checked]:border-brand-green">
                                    <input 
                                        type="radio" 
                                        name="activeTheme"
                                        value={t.name}
                                        checked={settings.activeTheme === t.name}
                                        onChange={e => handleSettingsChange('activeTheme', e.target.value)}
                                        className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
                                    />
                                    <span className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: t.color }}></span>
                                    <span className="font-medium text-gray-800">{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>

                 <CollapsibleSection title="Global Styles & Pages">
                    <div className="max-w-3xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Search Page Title</label>
                            <input 
                                type="text" 
                                value={settings.searchPage?.title || ''} 
                                onChange={e => handleSettingsChange('searchPage.title', e.target.value)} 
                                placeholder="Search Our Products" 
                                className={inputStyle}
                            />
                        </div>
                        <div className="pt-4 border-t">
                             <h3 className="text-lg font-semibold text-gray-800">Shop Page</h3>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Page Title</label>
                                 <input type="text" value={settings.shopPage?.title || ''} onChange={e => handleSettingsChange('shopPage.title', e.target.value)} className={inputStyle} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Page Subtitle</label>
                                 <textarea value={settings.shopPage?.subtitle || ''} onChange={e => handleSettingsChange('shopPage.subtitle', e.target.value)} className={inputStyle} rows={2} />
                             </div>
                         </div>
                        <div className="pt-4 border-t">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.enableGlobalCardOverlay || false} 
                                    onChange={e => handleSettingsChange('enableGlobalCardOverlay', e.target.checked)} 
                                    className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                                />
                                <span>Enable Card Overlay Texture Globally</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">This applies the configured "Surface Texture" from the color settings to all product cards. The "Apply Card Overlay" setting on individual products will also enable it if this is off.</p>
                        </div>
                        <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800">Mobile Viewport</h3>
                            <p className="text-sm text-gray-500 mt-1">Control how the site is displayed on mobile devices.</p>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-brand-green/10 has-[:checked]:border-brand-green">
                                    <input 
                                        type="radio" 
                                        name="mobileViewport"
                                        value="responsive"
                                        checked={settings.mobileViewport === 'responsive'}
                                        onChange={e => handleSettingsChange('mobileViewport', e.target.value)}
                                        className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
                                    />
                                    <span className="font-medium text-gray-800">Responsive (Normal Android/iOS View)</span>
                                </label>
                                <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-brand-green/10 has-[:checked]:border-brand-green">
                                    <input 
                                        type="radio" 
                                        name="mobileViewport"
                                        value="desktop"
                                        checked={settings.mobileViewport === 'desktop'}
                                        onChange={e => handleSettingsChange('mobileViewport', e.target.value)}
                                        className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
                                    />
                                    <span className="font-medium text-gray-800">Force Desktop View</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Theme Color Customization">
                     <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Define the color palettes for each theme. The values should be RGB (e.g., "107 127 115") or HEX (e.g., "#6B7F73").</p>
                         <div className="space-y-6">
                             {themes.map(t => (
                                 <div key={t.name} className="p-4 border rounded-lg">
                                     <h4 className="text-lg font-bold mb-2 flex items-center">
                                        <span className="w-5 h-5 rounded-full border border-gray-300 mr-2" style={{ backgroundColor: t.color }}></span>
                                        {t.label} Colors
                                    </h4>
                                     <div className="space-y-1">
                                         {colorProperties.map(prop => (
                                             <ColorInput
                                                 key={prop.key}
                                                 label={prop.label}
                                                 value={(settings.themeColors?.[t.name] as any)?.[prop.key] || ''}
                                                 onChange={val => handleSettingsChange(`themeColors.${t.name}.${prop.key}`, val)}
                                             />
                                         ))}
                                        <div className="pt-4 mt-4 border-t space-y-3">
                                            <h5 className="font-semibold text-gray-800">Button Background Image</h5>
                                            <p className="text-xs text-gray-500">Upload a full button image. It will be stretched to fit the button's dimensions.</p>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Button Background Image URL</label>
                                                <input type="text" placeholder="Image URL" value={(settings.themeColors?.[t.name] as any)?.buttonTextureUrl || ''} onChange={e => handleSettingsChange(`themeColors.${t.name}.buttonTextureUrl`, e.target.value)} className={inputStyle} />
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `themeColors.${t.name}.buttonTextureUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                            </div>
                                            <ColorInput
                                                label="Button Text Color"
                                                value={(settings.themeColors?.[t.name] as any)?.buttonTextColor || ''}
                                                onChange={val => handleSettingsChange(`themeColors.${t.name}.buttonTextColor`, val)}
                                            />
                                            <div className="pt-4 mt-4 border-t space-y-3">
                                                <h5 className="font-semibold text-gray-800">Card Overlay Image</h5>
                                                <p className="text-xs text-gray-500">This image will be used as an overlay on product cards where the "Apply Custom Card Overlay" option is checked. Use a seamless, tileable texture for best results (e.g., 300x300 pixels).</p>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Card Overlay Image URL</label>
                                                    <input type="text" placeholder="Image URL" value={(settings.themeColors?.[t.name] as any)?.surfaceTextureUrl || ''} onChange={e => handleSettingsChange(`themeColors.${t.name}.surfaceTextureUrl`, e.target.value)} className={inputStyle} />
                                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `themeColors.${t.name}.surfaceTextureUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Card Overlay Opacity ({Math.round(((settings.themeColors?.[t.name] as any)?.surfaceTextureOpacity ?? 0.2) * 100)}%)</label>
                                                    <input type="range" min="0" max="100" value={((settings.themeColors?.[t.name] as any)?.surfaceTextureOpacity ?? 0.2) * 100} onChange={e => handleSettingsChange(`themeColors.${t.name}.surfaceTextureOpacity`, Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                                </div>
                                            </div>
                                        </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                </CollapsibleSection>

                <CollapsibleSection title="Festive (Diwali) Theme Assets">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Customize the decorative images for the Diwali themes. Use transparent PNGs for the best effect.</p>
                        <DiwaliOverlayEditor
                            label="Header Garland (Mala)"
                            settings={settings.diwaliThemeSettings?.headerGarland}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.headerGarland"
                            themes={themes}
                        />
                         <DiwaliOverlayEditor
                            label="Header Streamer (Jhalar)"
                            settings={settings.diwaliThemeSettings?.headerOverlay}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.headerOverlay"
                            themes={themes}
                        />
                        <DiwaliOverlayEditor
                            label="Corner Decoration (Rangoli)"
                            settings={settings.diwaliThemeSettings?.cornerRangoli}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.cornerRangoli"
                            themes={themes}
                        />
                        <DiwaliOverlayEditor
                            label="Footer Fireworks"
                            settings={settings.diwaliThemeSettings?.fireworks}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.fireworks"
                            themes={themes}
                        />
                        <DiwaliOverlayEditor
                            label="Footer Diya Row"
                            settings={settings.diwaliThemeSettings?.diyaRow}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.diyaRow"
                            themes={themes}
                        />
                         <DiwaliOverlayEditor
                            label="Footer Decorative Overlay"
                            settings={settings.diwaliThemeSettings?.footerDecorativeOverlay}
                            onSettingChange={handleSettingsChange}
                            basePath="diwaliThemeSettings.footerDecorativeOverlay"
                            themes={themes}
                        />
                    </div>
                </CollapsibleSection>
                
                <CollapsibleSection title="Floating Decorations (Flowers, Diyas, etc.)">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Add decorative images that float on the page in fixed positions. Use transparent PNGs for the best results. Be mindful of performance; don't add too many.</p>
                        <div className="space-y-4">
                            {settings.floatingDecorations && Object.entries(settings.floatingDecorations).map(([id, decor]: [string, any]) => (
                                <div key={id} className="border p-4 rounded-lg space-y-3 relative bg-white">
                                    <div className="flex justify-between items-center">
                                        <input type="text" value={decor.name} onChange={e => handleSettingsChange(`floatingDecorations.${id}.name`, e.target.value)} placeholder="Decoration Name (for admin)" className={`${inputStyle} font-semibold`} />
                                        <button type="button" onClick={() => handleRemove(`floatingDecorations.${id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                    
                                    <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={decor.enabled} onChange={e => handleSettingsChange(`floatingDecorations.${id}.enabled`, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/><span>Enable this decoration</span></label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Image (Light Theme)</label>
                                            <input type="text" placeholder="Image URL" value={decor.imageUrl || ''} onChange={e => handleSettingsChange(`floatingDecorations.${id}.imageUrl`, e.target.value)} className={inputStyle} />
                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `floatingDecorations.${id}.imageUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                        </div>
                                         <div>
                                            <label className="block text-sm font-medium text-gray-700">Image (Dark Theme)</label>
                                            <input type="text" placeholder="Optional dark mode image URL" value={decor.darkImageUrl || ''} onChange={e => handleSettingsChange(`floatingDecorations.${id}.darkImageUrl`, e.target.value)} className={inputStyle} />
                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `floatingDecorations.${id}.darkImageUrl`)} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                         <div><label className="block text-sm font-medium">Width</label><input type="text" placeholder="e.g. 100px" value={decor.width} onChange={e => handleSettingsChange(`floatingDecorations.${id}.width`, e.target.value)} className={inputStyle}/></div>
                                         <div><label className="block text-sm font-medium">Height</label><input type="text" placeholder="e.g. 100px or auto" value={decor.height} onChange={e => handleSettingsChange(`floatingDecorations.${id}.height`, e.target.value)} className={inputStyle}/></div>
                                         <div><label className="block text-sm font-medium">Rotation (°)</label><input type="number" value={decor.rotation} onChange={e => handleSettingsChange(`floatingDecorations.${id}.rotation`, Number(e.target.value))} className={inputStyle}/></div>
                                         <div><label className="block text-sm font-medium">Z-Index</label><input type="number" value={decor.zIndex} onChange={e => handleSettingsChange(`floatingDecorations.${id}.zIndex`, Number(e.target.value))} className={inputStyle}/></div>
                                    </div>
                                    
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((decor.opacity ?? 1) * 100)}%)</label>
                                        <input type="range" min="0" max="100" value={(decor.opacity ?? 1) * 100} onChange={e => handleSettingsChange(`floatingDecorations.${id}.opacity`, Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <div><label className="block text-sm font-medium">Top</label><input type="text" placeholder="e.g. 10% or 50px" value={decor.top} onChange={e => handleSettingsChange(`floatingDecorations.${id}.top`, e.target.value)} className={inputStyle}/></div>
                                         <div><label className="block text-sm font-medium">Left</label><input type="text" placeholder="e.g. 10%" value={decor.left || ''} onChange={e => handleSettingsChange(`floatingDecorations.${id}.left`, e.target.value)} className={inputStyle}/></div>
                                         <div><label className="block text-sm font-medium">Right</label><input type="text" placeholder="e.g. 10%" value={decor.right || ''} onChange={e => handleSettingsChange(`floatingDecorations.${id}.right`, e.target.value)} className={inputStyle}/></div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Visible on themes:</label>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                                            {themes.map(t => (
                                                <label key={t.name} className="flex items-center space-x-1.5 text-sm font-medium text-gray-700">
                                                    <input type="checkbox" checked={decor.displayOnThemes ? (decor.displayOnThemes[t.name] ?? false) : false} onChange={e => { const newThemes = { ...(decor.displayOnThemes || {}), [t.name]: e.target.checked }; handleSettingsChange(`floatingDecorations.${id}.displayOnThemes`, newThemes); }} />
                                                    <span>{t.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => handleAdd('floatingDecorations', { name: 'New Decoration', enabled: true, imageUrl: '', top: '20%', left: '5%', width: '150px', opacity: 1, rotation: 0, zIndex: 1, displayOnThemes: { diwali: true, 'diwali-dark': true } })} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Decoration</button>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Header Overlap Image">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Add an image or GIF that overlaps the header. Useful for decorations like garlands or logos.</p>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={settings.headerOverlapImage?.enabled || false} onChange={e => handleSettingsChange('headerOverlapImage.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                            <span>Enable Header Overlap Image</span>
                        </label>

                        {settings.headerOverlapImage?.enabled && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Image URL (PNG, GIF recommended)</label>
                                    {settings.headerOverlapImage?.imageUrl && <img src={settings.headerOverlapImage.imageUrl} alt="Header overlap preview" className="max-h-24 object-contain rounded-md my-2 border bg-gray-100 p-2" />}
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'headerOverlapImage.imageUrl')} className="text-sm w-full file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                    <input type="text" value={settings.headerOverlapImage?.imageUrl || ''} onChange={e => handleSettingsChange('headerOverlapImage.imageUrl', e.target.value)} className={`${inputStyle} mt-2`} placeholder="Or paste image URL" />
                                    <button type="button" onClick={() => handleSettingsChange('headerOverlapImage.imageUrl', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Position</label>
                                        <select value={settings.headerOverlapImage?.position || 'full'} onChange={e => handleSettingsChange('headerOverlapImage.position', e.target.value)} className={inputStyle}>
                                            <option value="full">Full Width</option>
                                            <option value="left">Left</option>
                                            <option value="right">Right</option>
                                            <option value="center">Center</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings.headerOverlapImage?.opacity ?? 1) * 100)}%)</label>
                                        <input type="range" min="0" max="100" value={(settings.headerOverlapImage?.opacity ?? 1) * 100} onChange={e => handleSettingsChange('headerOverlapImage.opacity', Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><label className="block text-sm font-medium">Width</label><input type="text" placeholder="e.g. 100% or 300px" value={settings.headerOverlapImage?.width} onChange={e => handleSettingsChange('headerOverlapImage.width', e.target.value)} className={inputStyle}/></div>
                                    <div><label className="block text-sm font-medium">Height</label><input type="text" placeholder="e.g. 150px" value={settings.headerOverlapImage?.height} onChange={e => handleSettingsChange('headerOverlapImage.height', e.target.value)} className={inputStyle}/></div>
                                    <div><label className="block text-sm font-medium">Top Offset</label><input type="text" placeholder="e.g. 0px or -20px" value={settings.headerOverlapImage?.top} onChange={e => handleSettingsChange('headerOverlapImage.top', e.target.value)} className={inputStyle}/></div>
                                    <div><label className="block text-sm font-medium">Z-Index</label><input type="number" value={settings.headerOverlapImage?.zIndex} onChange={e => handleSettingsChange('headerOverlapImage.zIndex', Number(e.target.value))} className={inputStyle}/></div>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                 <CollapsibleSection title="Bottom Blend Effect">
                    <div className="max-w-3xl space-y-4">
                        <p className="text-sm text-gray-600">Add a decorative image that fades in from the bottom of the page. Sits behind all content.</p>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={settings.bottomBlend?.enabled || false} onChange={e => handleSettingsChange('bottomBlend.enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"/>
                            <span>Enable Bottom Blend Effect</span>
                        </label>
                        {settings.bottomBlend?.enabled && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Image (Light Theme)</label>
                                        <input type="text" placeholder="Image URL" value={settings.bottomBlend.imageUrl || ''} onChange={e => handleSettingsChange('bottomBlend.imageUrl', e.target.value)} className={inputStyle} />
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'bottomBlend.imageUrl')} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Image (Dark Theme)</label>
                                        <input type="text" placeholder="Optional dark mode image URL" value={settings.bottomBlend.darkImageUrl || ''} onChange={e => handleSettingsChange('bottomBlend.darkImageUrl', e.target.value)} className={inputStyle} />
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'bottomBlend.darkImageUrl')} className="text-sm w-full mt-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700">Opacity ({Math.round((settings.bottomBlend.opacity ?? 0.5) * 100)}%)</label>
                                        <input type="range" min="0" max="100" value={(settings.bottomBlend.opacity ?? 0.5) * 100} onChange={e => handleSettingsChange('bottomBlend.opacity', Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Height</label>
                                        <input type="text" placeholder="e.g. 350px or 40vh" value={settings.bottomBlend.height || ''} onChange={e => handleSettingsChange('bottomBlend.height', e.target.value)} className={inputStyle}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Visible on themes:</label>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
                                        {themes.map(t => (
                                            <label key={t.name} className="flex items-center space-x-1.5 text-sm font-medium text-gray-700">
                                                <input type="checkbox" checked={settings.bottomBlend.displayOnThemes?.[t.name] ?? false} onChange={e => { const newThemes = { ...(settings.bottomBlend.displayOnThemes || {}), [t.name]: e.target.checked }; handleSettingsChange(`bottomBlend.displayOnThemes`, newThemes); }} />
                                                <span>{t.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 </CollapsibleSection>

                <CollapsibleSection title="Global & Header">
                    <div className="max-w-3xl space-y-4">
                        <h2 className="text-xl font-bold">Global</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Site Title</label>
                            <div className="flex items-center space-x-3 mt-1">
                                <input type="text" value={settings.siteTitle} onChange={e => handleSettingsChange('siteTitle', e.target.value)} className={inputStyle} disabled={settings.useImageForTitle} />
                                <label className="flex items-center space-x-2 text-sm">
                                    <input type="checkbox" checked={settings.useImageForTitle || false} onChange={e => handleSettingsChange('useImageForTitle', e.target.checked)} />
                                    <span>Use Image</span>
                                </label>
                            </div>
                        </div>
                        {settings.useImageForTitle && (
                            <div className="p-3 border rounded-lg bg-gray-50/50">
                                <label className="block text-sm font-medium text-gray-700">Site Title Image/GIF</label>
                                {settings.siteTitleImageUrl && <img src={settings.siteTitleImageUrl} alt="Site Title" className="h-12 my-2 border p-1 rounded bg-white" />}
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'siteTitleImageUrl')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                                <input type="text" placeholder="Or paste image URL" value={settings.siteTitleImageUrl || ''} onChange={e => handleSettingsChange('siteTitleImageUrl', e.target.value)} className={`${inputStyle} mt-2`}/>
                                <button type="button" onClick={()=>handleSettingsChange('siteTitleImageUrl', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Image</button>
                            </div>
                        )}
                        <div><label className="block text-sm font-medium text-gray-700">Logo</label><img src={settings.logoUrl || 'https://via.placeholder.com/128x32'} alt="Logo" className="h-10 my-2 border p-1 rounded bg-gray-50" /><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/><input type="text" placeholder="Or paste image URL" value={settings.logoUrl} onChange={e => handleSettingsChange('logoUrl', e.target.value)} className={`${inputStyle} mt-2`}/><button type="button" onClick={()=>handleSettingsChange('logoUrl', '')} className="text-xs text-red-500 hover:underline mt-1">Remove Logo</button></div>
                        <h2 className="text-xl font-bold pt-4">Header Settings</h2>
                         <div><label className="block text-sm font-medium text-gray-700">Navigation Links</label><div className="space-y-4 mt-2">{settings.header.navLinks && Object.entries(settings.header.navLinks).map(([id, link]: [string, any]) => (<div key={id} className="border p-3 rounded-md space-y-2"><div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center"><input type="text" value={link.text} onChange={e => handleSettingsChange(`header.navLinks.${id}.text`, e.target.value)} className={`${inputStyle} col-span-2`} /><select value={link.linkType} onChange={e => { handleSettingsChange(`header.navLinks.${id}.link`, ''); handleSettingsChange(`header.navLinks.${id}.linkType`, e.target.value); }} className={`${inputStyle} col-span-2`}><option value="internal">Internal Page</option><option value="external">External URL</option><option value="product">Product</option><option value="category">Category</option></select><div className="col-span-3">{link.linkType === 'internal' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`header.navLinks.${id}.link`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop" />}{link.linkType === 'external' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`header.navLinks.${id}.link`, e.target.value)} className={inputStyle} placeholder="https://..." />}{link.linkType === 'product' && <select value={link.link} onChange={e => handleSettingsChange(`header.navLinks.${id}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}{link.linkType === 'category' && <select value={link.link} onChange={e => handleSettingsChange(`header.navLinks.${id}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}</div><button type="button" onClick={() => handleRemove(`header.navLinks.${id}`)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5 mx-auto"/></button></div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Visible on themes:</label>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                    {themes.map(t => (
                                        <label key={t.name} className="flex items-center space-x-1.5 text-xs font-medium text-gray-700">
                                            <input 
                                                type="checkbox" 
                                                checked={link.displayThemes ? (link.displayThemes[t.name] ?? false) : true}
                                                onChange={e => handleThemeLinkChange(`header.navLinks.${id}`, t.name, e.target.checked)}
                                            />
                                            <span>{t.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                         </div>))}<button type="button" onClick={() => handleAdd('header.navLinks')} className="mt-4 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Nav Link</button></div></div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Footer Settings">
                    <div className="max-w-3xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Footer Description</label>
                            <textarea value={settings.footer?.description || ''} onChange={e => handleSettingsChange('footer.description', e.target.value)} className={inputStyle} rows={2}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Copyright Text</label>
                            <input type="text" value={settings.footer?.copyrightText || ''} onChange={e => handleSettingsChange('footer.copyrightText', e.target.value)} placeholder={`© ${new Date().getFullYear()} ${settings.siteTitle}. All rights reserved.`} className={inputStyle}/>
                        </div>
                        
                        <div className="p-4 border rounded-lg space-y-3">
                            <h3 className="text-lg font-semibold">Contact Info</h3>
                            <div><label className="block text-sm font-medium">Phone</label><input type="text" value={settings.footer?.contactInfo?.phone || ''} onChange={e => handleSettingsChange('footer.contactInfo.phone', e.target.value)} className={inputStyle}/></div>
                            <div><label className="block text-sm font-medium">Email</label><input type="email" value={settings.footer?.contactInfo?.email || ''} onChange={e => handleSettingsChange('footer.contactInfo.email', e.target.value)} className={inputStyle}/></div>
                            <div><label className="block text-sm font-medium">Location</label><input type="text" value={settings.footer?.contactInfo?.location || ''} onChange={e => handleSettingsChange('footer.contactInfo.location', e.target.value)} className={inputStyle}/></div>
                        </div>

                        <div className="p-4 border rounded-lg space-y-3">
                            <h3 className="text-lg font-semibold">Social Media</h3>
                            <div>
                                <label className="block text-sm font-medium">Icon Size (px)</label>
                                <input type="number" value={settings.footer?.socialIconSize || 24} onChange={e => handleSettingsChange('footer.socialIconSize', Number(e.target.value))} className={inputStyle} style={{width: '100px'}}/>
                            </div>
                            {settings.footer?.socialLinks && Object.entries(settings.footer.socialLinks).map(([id, link]: [string, any]) => (
                                <div key={id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                    <select value={link.platform} onChange={e => handleSettingsChange(`footer.socialLinks.${id}.platform`, e.target.value)} className={inputStyle}>
                                        <option value="facebook">Facebook</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="twitter">Twitter</option>
                                        <option value="youtube">Youtube</option>
                                        <option value="pinterest">Pinterest</option>
                                        <option value="linkedin">Linkedin</option>
                                    </select>
                                    <input type="text" value={link.url} onChange={e => handleSettingsChange(`footer.socialLinks.${id}.url`, e.target.value)} className={inputStyle} placeholder="https://..."/>
                                    <button type="button" onClick={() => handleRemove(`footer.socialLinks.${id}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAdd('footer.socialLinks')} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Social Link</button>
                        </div>

                        <div className="p-4 border rounded-lg space-y-3">
                            <h3 className="text-lg font-semibold">Footer Columns & Links</h3>
                            {settings.footer?.columns && Object.entries(settings.footer.columns).map(([colId, col]: [string, any]) => (
                                <div key={colId} className="border p-3 rounded-md space-y-2 bg-gray-50/50">
                                    <div className="flex justify-between items-center">
                                        <input type="text" value={col.title} onChange={e => handleSettingsChange(`footer.columns.${colId}.title`, e.target.value)} className={`${inputStyle} font-semibold`} placeholder="Column Title"/>
                                        <button type="button" onClick={() => handleRemove(`footer.columns.${colId}`)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                    {col.links && Object.entries(col.links).map(([linkId, link]: [string, any]) => (
                                        <div key={linkId} className="border p-2 rounded bg-white">
                                            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_3fr_1.5fr_auto] gap-2 items-center">
                                                <input type="text" value={link.text} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.text`, e.target.value)} className={inputStyle} placeholder="Link Text"/>
                                                <select value={link.linkType} onChange={e => { handleSettingsChange(`footer.columns.${colId}.links.${linkId}.link`, ''); handleSettingsChange(`footer.columns.${colId}.links.${linkId}.linkType`, e.target.value); }} className={inputStyle}>
                                                    <option value="internal">Internal Page</option><option value="external">External URL</option><option value="product">Product</option><option value="category">Category</option>
                                                </select>
                                                <div>
                                                    {link.linkType === 'internal' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.link`, e.target.value)} className={inputStyle} placeholder="e.g. home, shop"/>}
                                                    {link.linkType === 'external' && <input type="text" value={link.link} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.link`, e.target.value)} className={inputStyle} placeholder="https://..."/>}
                                                    {link.linkType === 'product' && <select value={link.link} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{products.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select>}
                                                    {link.linkType === 'category' && <select value={link.link} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.link`, e.target.value)} className={inputStyle}><option value="">-- Select --</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>}
                                                </div>
                                                <select value={link.icon || 'none'} onChange={e => handleSettingsChange(`footer.columns.${colId}.links.${linkId}.icon`, e.target.value)} className={inputStyle}>
                                                    <option value="none">No Icon</option><option value="phone">Phone</option><option value="mail">Email</option><option value="cart">Cart</option><option value="arrowRight">Arrow</option>
                                                </select>
                                                <button type="button" onClick={() => handleRemove(`footer.columns.${colId}.links.${linkId}`)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4 mx-auto"/></button>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAdd(`footer.columns.${colId}.links`)} className="mt-2 text-xs font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-3 h-3"/> Add Link</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => handleAdd('footer.columns')} className="mt-2 text-sm font-medium text-brand-green hover:underline flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Footer Column</button>
                        </div>
                    </div>
                 </CollapsibleSection>

                 <CollapsibleSection title="Product Page Settings">
                    <div className="max-w-3xl space-y-4">
                         <div><label className="block text-sm font-medium text-gray-700">Shipping & Returns Information</label><textarea value={settings.productPage?.shippingReturnsInfo || ''} onChange={e => handleSettingsChange('productPage.shippingReturnsInfo', e.target.value)} className={inputStyle} rows={4} placeholder="Enter shipping and returns info. Supports HTML."/></div>
                         <h3 className="text-lg font-semibold pt-2">Page Buttons</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-md font-medium text-gray-800">"Add to Cart" Button</label>
                                <ActionButtonEditor path="productPage.buttons.addToCart" settings={settings.productPage?.buttons?.addToCart || {}} onChange={handleSettingsChange} products={products} categories={categories} />
                            </div>
                             <div>
                                <label className="block text-md font-medium text-gray-800">"Buy Now" Button</label>
                                <ActionButtonEditor path="productPage.buttons.buyNow" settings={settings.productPage?.buttons?.buyNow || {}} onChange={handleSettingsChange} products={products} categories={categories} />
                            </div>
                         </div>
                    </div>
                </CollapsibleSection>
            </form>
        </div>
    )
}


// --- Main Admin Dashboard Component ---
const AdminDashboard: React.FC = () => {
    const { currentUser, userProfile, logout } = useAuth();
    const { navigate } = useNavigation();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'products');

    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (!currentUser) {
            navigate('login');
            return;
        }

        if (userProfile) { // if user profile is loaded
            if (userProfile.role !== 'admin') {
                navigate('home'); // not an admin, go away
            } else {
                setLoading(false); // is an admin, show content
            }
        }
        // if userProfile is null, we are still loading, so `loading` remains true.
        // The effect will re-run when `userProfile` is updated by `AuthContext`.
    }, [currentUser, userProfile, navigate]);
    
    const handleLogout = async () => { try { await logout(); navigate('home'); } catch {} };
    if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Verifying access...</div>;

    const renderContent = () => {
        switch (activeTab) {
            case 'products': return <ProductsManager />;
            case 'users': return <UsersManager />;
            case 'categories': return <CategoriesManager />;
            case 'homepage': return <HomepageSettingsManager />;
            case 'theme': return <ThemeSettingsManager />;
            default: return <ProductsManager />;
        }
    }
    const TabButton: FC<{tabName: string; label: string}> = ({ tabName, label }) => (<button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabName ? 'bg-brand-green text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{label}</button>);

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm sticky top-0 z-10"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-20"><a href="#" onClick={(e) => { e.preventDefault(); navigate('home'); }} className="flex items-center space-x-2"><img className="h-10 w-auto rounded-full" src="https://i.ibb.co/7j0b561/logo.png" alt="AURASHKA Logo" /><span className="text-xl font-serif tracking-widest uppercase text-brand-dark">Admin Panel</span></a><button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-brand-dark px-4 py-2 rounded-lg hover:bg-gray-50">Logout</button></div></div></header>
            <main className="py-10"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="mb-6 bg-white p-2 rounded-lg shadow-sm flex items-center space-x-2 overflow-x-auto"><TabButton tabName="products" label="Products" /><TabButton tabName="categories" label="Categories" /><TabButton tabName="users" label="Users" /><TabButton tabName="homepage" label="Homepage Content" /><TabButton tabName="theme" label="Theme Settings" /></div><div className="space-y-6">{renderContent()}</div></div></main>
        </div>
    );
};

export default AdminDashboard;