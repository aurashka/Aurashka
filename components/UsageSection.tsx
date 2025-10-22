import React, { useState, useEffect } from 'react';
import { SparkleIcon } from './Icons';
import { db } from '../firebase';
import LazyImage from './LazyImage';

interface UsageContent {
    enabled?: boolean;
    title: string;
    subtitle: string;
    box1Text: string;
    box2Text: string;
    image: string;
}

const UsageSection: React.FC = () => {
    const [content, setContent] = useState<UsageContent>({
        enabled: true,
        title: 'Using Our Product',
        subtitle: 'It is a long established fact that a reader will be distracted by the readable content.',
        box1Text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
        box2Text: 'It is a long established fact that a reader will be distracted by the readable content.',
        image: 'https://images.unsplash.com/photo-1620916566398-39f168a7676b?q=80&w=1889&auto=format&fit=crop&ixlib-rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    });
    
    useEffect(() => {
        const usageRef = db.ref('site_settings/usageSection');
        const listener = usageRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setContent(prev => ({...prev, ...data}));
            }
        });

        return () => usageRef.off('value', listener);
    }, []);

    if (content.enabled === false) {
        return null;
    }

  return (
    <section className="py-24 bg-brand-surface">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-serif font-bold text-brand-text">{content.title}</h2>
            <p className="mt-4 text-brand-secondary">
              {content.subtitle}
            </p>
            <div className="mt-8 space-y-6">
              <div className="p-6 border border-brand-light-gray rounded-lg">
                <p className="text-brand-secondary">
                  {content.box1Text}
                </p>
              </div>
              <div className="p-6 bg-brand-green/10 border border-brand-green/20 rounded-lg">
                <p className="text-brand-text">
                  {content.box2Text}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative group text-center w-96 h-[500px]">
              <div className="relative w-full h-full p-2 mx-auto border border-brand-light-gray/50 rounded-t-[180px] rounded-b-xl shadow-sm">
                <div className="overflow-hidden rounded-t-[180px] rounded-b-lg h-full">
                  <LazyImage
                    wrapperClassName="w-full h-full"
                    src={content.image}
                    alt="Serum bottle"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                  />
                </div>
                 <SparkleIcon className="absolute top-32 -left-3 text-brand-green w-10 h-10 opacity-80" />
                 <SparkleIcon className="absolute top-32 -right-3 text-brand-green w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsageSection;