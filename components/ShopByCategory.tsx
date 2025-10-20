import React, { useState, useEffect } from 'react';
import { initialCategories } from '../constants';
import { Category, CategoryCardSettings } from '../types';
import { SparkleIcon, StarIcon, LeafIcon } from './Icons';
import { db } from '../firebase';
import { CategoryCardSkeleton } from './Skeletons';
import { useNavigation } from '../contexts/NavigationContext';
import LazyImage from './LazyImage';

const DecorationIcon: React.FC<{ settings: CategoryCardSettings }> = ({ settings }) => {
    if (settings.decorationIcon === 'none') return null;

    const iconProps = {
        className: "absolute top-24 -left-1 opacity-80",
        style: {
            color: settings.decorationIconColor,
            width: `${settings.decorationIconSize}px`,
            height: `${settings.decorationIconSize}px`,
        }
    };

    const icons = {
        sparkle: <SparkleIcon {...iconProps} />,
        star: <StarIcon {...iconProps} />,
        leaf: <LeafIcon {...iconProps} />,
    };

    const renderIcon = (side: 'left' | 'right') => {
        const props = { ...iconProps, className: `absolute top-24 ${side === 'left' ? '-left-1' : '-right-1'} opacity-80` };
        if (settings.decorationIcon === 'custom' && settings.customDecorationIconUrl) {
            return <img src={settings.customDecorationIconUrl} alt="decoration" style={props.style} className={props.className} />;
        }
        return settings.decorationIcon in icons ? React.cloneElement(icons[settings.decorationIcon as keyof typeof icons], props) : null;
    };
    
    return <>
        {renderIcon('left')}
        {renderIcon('right')}
    </>;
};

const CategoryCard: React.FC<{ category: Category; settings: CategoryCardSettings }> = ({ category, settings }) => {
    const { navigate } = useNavigation();

    const handleCategoryClick = () => {
        navigate('shop', { categoryId: category.id, categoryName: category.name });
    };
    
    const cardStyle: React.CSSProperties = {
        height: settings.height || '384px',
    };

    const containerStyle: React.CSSProperties = {
        borderTopLeftRadius: settings.borderRadiusTop || '150px',
        borderTopRightRadius: settings.borderRadiusTop || '150px',
        borderBottomLeftRadius: settings.borderRadiusBottom || '12px',
        borderBottomRightRadius: settings.borderRadiusBottom || '12px',
    };

    return (
        <div 
            className="relative group text-center flex-shrink-0 w-72 cursor-pointer"
            onClick={handleCategoryClick}
        >
            <div 
                className="relative p-2 mx-auto border border-brand-light-gray/50 shadow-sm"
                style={{ ...cardStyle, ...containerStyle }}
            >
                <div className="overflow-hidden h-full" style={containerStyle}>
                    <LazyImage 
                        wrapperClassName="w-full h-full"
                        src={category.image} 
                        alt={category.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" 
                    />
                </div>
                {settings.frameImageUrl && (
                    <div 
                        className="absolute inset-0 pointer-events-none bg-contain bg-no-repeat bg-center"
                        style={{ backgroundImage: `url('${settings.frameImageUrl}')`, ...containerStyle }}
                    ></div>
                )}
                <DecorationIcon settings={settings} />
            </div>
            <h3 className="mt-6 text-xl font-serif font-bold text-brand-text">{category.name}</h3>
        </div>
    );
};

const ShopByCategory: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CategoryCardSettings | null>(null);
  const [title, setTitle] = useState('Shop by Category');

  useEffect(() => {
    const categoriesRef = db.ref('categories');
    const settingsRef = db.ref('site_settings');
    
    const catListener = categoriesRef.on('value', (snapshot) => {
      const categoriesData = snapshot.val();
      if (categoriesData) {
        const categoriesList = Object.keys(categoriesData).map(key => ({
          id: key,
          ...categoriesData[key]
        }));
        setCategories(categoriesList);
      } else {
        setCategories(initialCategories);
      }
      setLoading(false);
    });

    const settingsListener = settingsRef.on('value', snapshot => {
        const data = snapshot.val();
        setSettings(data?.categoryCardSettings || null);
        setTitle(data?.shopByCategoryTitle || 'Shop by Category');
    });

    return () => {
        categoriesRef.off('value', catListener);
        settingsRef.off('value', settingsListener);
    };
  }, []);

  const defaultSettings: CategoryCardSettings = {
      height: '384px',
      borderRadiusTop: '150px',
      borderRadiusBottom: '12px',
      decorationIcon: 'sparkle',
      decorationIconSize: 32,
      decorationIconColor: 'rgb(var(--color-primary))',
  };

  const finalSettings = { ...defaultSettings, ...(settings || {}) };

  return (
    <section className="py-24 bg-brand-surface relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-serif font-bold text-center text-brand-text mb-16">
          {title}
        </h2>
        
        {loading ? (
            <div className="flex space-x-8 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
            </div>
        ) : (
            <div className="flex overflow-x-auto space-x-8 pb-4 -mx-4 px-4 scrollbar-hide">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} settings={finalSettings} />
              ))}
            </div>
        )}
      </div>
    </section>
  );
};

export default ShopByCategory;