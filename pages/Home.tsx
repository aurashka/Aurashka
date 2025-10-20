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
import { OfferSectionSettings, HighlightedNoteSettings, BestsellerListSettings } from '../types';
import BestsellerList from '../components/BestsellerList';


const Home: React.FC = () => {
  const [customSections, setCustomSections] = useState<{ [key: string]: OfferSectionSettings } | null>(null);
  const [noteSettings, setNoteSettings] = useState<HighlightedNoteSettings | null>(null);
  const [bestsellerLists, setBestsellerLists] = useState<{ [key: string]: BestsellerListSettings } | null>(null);


  useEffect(() => {
    const settingsRef = db.ref('site_settings');
    const listener = settingsRef.on('value', snapshot => {
      const data = snapshot.val();
      setCustomSections(data?.offerSections || null);
      setNoteSettings(data?.highlightedNote || null);
      setBestsellerLists(data?.bestsellerLists || null);
    });
    return () => settingsRef.off('value', listener);
  }, []);

  const [topSections, defaultSections, bottomSections] = useMemo(() => {
    if (!customSections) return [[], [], []];
    
    const enabled = Object.values(customSections)
        .filter((section: OfferSectionSettings) => section.enabled)
        .sort((a: OfferSectionSettings, b: OfferSectionSettings) => a.order - b.order);

    // FIX: Cast `s` to OfferSectionSettings to resolve issue where it is inferred as 'unknown'.
    const top = enabled.filter((s: OfferSectionSettings) => s.location === 'top');
    // FIX: Cast `s` to OfferSectionSettings to resolve issue where it is inferred as 'unknown'.
    const bottom = enabled.filter((s: OfferSectionSettings) => s.location === 'bottom');
    // FIX: Cast `s` to OfferSectionSettings to resolve issue where it is inferred as 'unknown'.
    const def = enabled.filter((s: OfferSectionSettings) => s.location === 'default' || !s.location);

    return [top, def, bottom];
  }, [customSections]);

  const [topBestsellers, defaultBestsellers, bottomBestsellers] = useMemo(() => {
    if (!bestsellerLists) return [[], [], []];
    
    const enabled = Object.values(bestsellerLists)
        .filter((list: BestsellerListSettings) => list.enabled)
        .sort((a: BestsellerListSettings, b: BestsellerListSettings) => a.order - b.order);

    const top = enabled.filter((l: BestsellerListSettings) => l.location === 'top');
    const bottom = enabled.filter((l: BestsellerListSettings) => l.location === 'bottom');
    const def = enabled.filter((l: BestsellerListSettings) => l.location === 'default' || !l.location);

    return [top, def, bottom];
  }, [bestsellerLists]);


  return (
    <>
      <Hero />
      <ImageScroller />
      <ShopByCategory />
      {topSections.map(section => (
        <CustomOfferSection key={section.id} section={section} />
      ))}
       {topBestsellers.map(list => (
        <BestsellerList key={list.id} section={list} />
      ))}
      {noteSettings && noteSettings.enabled && <HighlightedNote settings={noteSettings} />}
      <ProductShowcase />
      <UsageSection />
      <Testimonials />
      {defaultSections.map(section => (
        <CustomOfferSection key={section.id} section={section} />
      ))}
      {defaultBestsellers.map(list => (
        <BestsellerList key={list.id} section={list} />
      ))}
      {bottomSections.map(section => (
        <CustomOfferSection key={section.id} section={section} />
      ))}
      {bottomBestsellers.map(list => (
        <BestsellerList key={list.id} section={list} />
      ))}
    </>
  );
};

export default Home;