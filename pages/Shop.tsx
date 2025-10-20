import React, { useState, useEffect, useMemo } from 'react';
import { allProducts as staticProducts } from '../constants';
import ProductCard from '../components/ProductCard';
import { db } from '../firebase';
import { Product, Category, SubCategory } from '../types';
import { initialCategories } from '../constants';
import { SearchIcon } from '../components/Icons';
import { ProductCardSkeleton } from '../components/Skeletons';
import { useNavigation } from '../contexts/NavigationContext';
import { useSiteSettings } from '../contexts/SettingsContext';

const Shop: React.FC = () => {
  const { params } = useNavigation();
  const settings = useSiteSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');

  const pageTitle = settings.shopPage?.title || 'Our Products';
  const pageSubtitle = settings.shopPage?.subtitle || 'Discover our curated collection of nature-inspired beauty essentials.';

  useEffect(() => {
    const productsRef = db.ref('products');
    const categoriesRef = db.ref('categories');

    const productListener = productsRef.on('value', (snapshot) => {
      const firebaseProductsData = snapshot.val();
      const firebaseProducts: Product[] = firebaseProductsData 
        ? Object.keys(firebaseProductsData).map(key => ({
            ...firebaseProductsData[key],
            id: key
          })) 
        : [];
      
      const combinedProducts = new Map<number | string, Product>();
      staticProducts.forEach(p => combinedProducts.set(p.id, p));
      firebaseProducts.forEach(p => combinedProducts.set(p.id, p));
      
      // Shuffle products for a more dynamic feel on each load
      setProducts(Array.from(combinedProducts.values()).sort(() => Math.random() - 0.5));
      setLoading(false);
    });

    const categoryListener = categoriesRef.on('value', (snapshot) => {
      const categoriesData = snapshot.val();
      if (categoriesData) {
        const categoriesList = Object.keys(categoriesData).map(key => ({
          id: key,
          ...categoriesData[key],
          subcategories: categoriesData[key].subcategories ? Object.values(categoriesData[key].subcategories) : []
        }));
        setCategories(categoriesList);
      }
    });

    return () => {
      productsRef.off('value', productListener);
      categoriesRef.off('value', categoryListener);
    }
  }, []);

  useEffect(() => {
    if (params?.categoryName) {
      setSelectedCategory(params.categoryName);
      window.scrollTo(0, 0); // Scroll to top when category changes via nav
    }
  }, [params]);

  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const cat = categories.find(c => c.name === selectedCategory);
    return cat?.subcategories || [];
  }, [selectedCategory, categories]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => product.isVisible !== false) // Filter for visible products
      .filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(product => 
        selectedCategory === 'All' || product.category === selectedCategory
      )
      .filter(product => 
        selectedSubCategory === 'All' || product.subcategory === selectedSubCategory
      );
  }, [products, searchTerm, selectedCategory, selectedSubCategory]);

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedSubCategory('All');
  };
  
  // Define classes for the masonry grid pattern
  const getGridItemClasses = (index: number) => {
    const patternIndex = index % 10; // Repeat pattern every 10 items
    switch(patternIndex) {
        case 0:
            return "md:col-span-2 md:row-span-2";
        case 5:
            return "md:row-span-2";
        default:
            return "";
    }
  };


  return (
    <section className="py-24 bg-brand-bg min-h-[60vh]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-brand-text">{pageTitle}</h1>
          <p className="mt-4 max-w-2xl mx-auto text-brand-secondary">
            {pageSubtitle}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-12 sticky top-24 z-10 bg-brand-bg/80 backdrop-blur-sm py-4 rounded-lg space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:flex-1">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-light-gray text-brand-text rounded-full focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-secondary" />
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-2">
                    <button onClick={() => handleCategoryClick('All')} className={`px-4 py-2 text-sm rounded-full transition-colors ${selectedCategory === 'All' ? 'bg-brand-green text-white' : 'bg-brand-surface text-brand-text hover:bg-brand-light-gray/50'}`}>All</button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => handleCategoryClick(cat.name)} className={`px-4 py-2 text-sm rounded-full transition-colors whitespace-nowrap ${selectedCategory === cat.name ? 'bg-brand-green text-white' : 'bg-brand-surface text-brand-text hover:bg-brand-light-gray/50'}`}>{cat.name}</button>
                    ))}
                </div>
            </div>
            {availableSubcategories.length > 0 && (
                 <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 animate-fade-in-up">
                    <button onClick={() => setSelectedSubCategory('All')} className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedSubCategory === 'All' ? 'bg-brand-text text-brand-surface' : 'bg-brand-surface text-brand-text hover:bg-brand-light-gray/50'}`}>All {selectedCategory}</button>
                    {availableSubcategories.map((sub: SubCategory) => (
                        <button key={sub.id} onClick={() => setSelectedSubCategory(sub.name)} className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${selectedSubCategory === sub.name ? 'bg-brand-text text-brand-surface' : 'bg-brand-surface text-brand-text hover:bg-brand-light-gray/50'}`}>{sub.name}</button>
                    ))}
                </div>
            )}
        </div>
        
        {loading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 grid-flow-row-dense gap-6 animate-fade-in-up">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <div key={product.id} className={getGridItemClasses(index)}>
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-brand-secondary">No products found.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shop;
