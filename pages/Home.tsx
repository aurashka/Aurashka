import React, { useState, useEffect, useMemo } from 'react';
import Hero from '../components/Hero';
import ShopByCategory from '../components/ShopByCategory';
import ProductShowcase from '../components/ProductShowcase';
import UsageSection from '../components/UsageSection';
import ImageScroller from '../components/ImageScroller';
import CustomOfferSection from '../components/CustomOfferSection';
import HighlightedNote from '../components/HighlightedNote';
import Testimonials from '../components/Testimonials';
import { db } from '../firebase';
import { OfferSectionSettings, HighlightedNoteSettings, BestsellerListSettings, ProductShowcaseSettings } from '../types';
import BestsellerList from '../components/BestsellerList';


const Home: React.FC = () => {
  const [customSections, setCustomSections] = useState<{ [key: string]: OfferSectionSettings } | null>(null);
  const [noteSettings, setNoteSettings] = useState<HighlightedNoteSettings | null>(null);
  const [bestsellerLists, setBestsellerLists] = useState<{ [key: string]: BestsellerListSettings } | null>(null);
  const [productShowcaseSettings, setProductShowcaseSettings] = useState<ProductShowcaseSettings | null>(null);


  useEffect(() => {
    const settingsRef = db.ref('site_settings');
    const listener = settingsRef.on('value', snapshot => {
      const data = snapshot.val();
      setCustomSections(data?.offerSections || null);
      setNoteSettings(data?.highlightedNote || null);
      setBestsellerLists(data?.bestsellerLists || null);
      setProductShowcaseSettings(data?.productShowcaseSection || null);
    });
    return () => settingsRef.off('value', listener);
  }, []);
  
  const { topSections, defaultSections, bottomSections } = useMemo(() => {
    const allSections: any[] = [];

    if (customSections) {
        // FIX: Cast the result of Object.values to a typed array to resolve TypeScript errors where the element type was inferred as 'unknown'.
        (Object.values(customSections) as OfferSectionSettings[]).forEach(s => s.enabled && allSections.push({ ...s, type: 'offer' }));
    }
    if (bestsellerLists) {
        // FIX: Cast the result of Object.values to a typed array to resolve TypeScript errors where the element type was inferred as 'unknown'.
        (Object.values(bestsellerLists) as BestsellerListSettings[]).forEach(s => s.enabled && allSections.push({ ...s, type: 'bestseller' }));
    }
    if (productShowcaseSettings && productShowcaseSettings.enabled) {
        allSections.push({ ...productShowcaseSettings, id: 'product-showcase', type: 'showcase' });
    }

    allSections.sort((a, b) => (a.order || 99) - (b.order || 99));

    const renderSection = (section: any) => {
        switch (section.type) {
            case 'offer': return <CustomOfferSection key={section.id} section={section} />;
            case 'bestseller': return <BestsellerList key={section.id} section={section} />;
            case 'showcase': return <ProductShowcase key={section.id} />;
            default: return null;
        }
    };
    
    return {
        topSections: allSections.filter(s => s.location === 'top').map(renderSection),
        defaultSections: allSections.filter(s => s.location === 'default' || !s.location).map(renderSection),
        bottomSections: allSections.filter(s => s.location === 'bottom').map(renderSection)
    };
  }, [customSections, bestsellerLists, productShowcaseSettings]);


  return (
    <>
      <Hero />
      <ImageScroller />
      <ShopByCategory />
      {topSections}
      {noteSettings && noteSettings.enabled && <HighlightedNote settings={noteSettings} />}
      <UsageSection />
      <Testimonials />
      {defaultSections}
      {bottomSections}
    </>
  );
};

export default Home;
