import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
    <div className="group text-center">
        <div className="relative bg-brand-light-gray animate-pulse overflow-hidden rounded-lg aspect-square"></div>
        <div className="mt-4 text-center">
            <div className="h-6 bg-brand-light-gray animate-pulse rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-brand-light-gray animate-pulse rounded w-1/2 mx-auto mt-2"></div>
        </div>
    </div>
);

export const CategoryCardSkeleton: React.FC = () => (
     <div className="relative group text-center">
        <div className="relative w-72 h-96 p-2 mx-auto border border-brand-light-gray/50 rounded-t-[150px] rounded-b-xl shadow-sm">
            <div className="bg-brand-light-gray animate-pulse rounded-t-[150px] rounded-b-lg h-full"></div>
        </div>
        <div className="h-6 mt-6 bg-brand-light-gray animate-pulse rounded w-1/2 mx-auto"></div>
    </div>
);

export const ProductDetailSkeleton: React.FC = () => (
    <section className="py-24 bg-brand-bg">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-pulse">
                {/* Image Gallery Skeleton */}
                <div>
                    <div className="bg-brand-light-gray rounded-lg h-96 mb-4"></div>
                    <div className="flex space-x-2">
                        <div className="w-20 h-20 rounded-md bg-brand-light-gray"></div>
                        <div className="w-20 h-20 rounded-md bg-brand-light-gray"></div>
                        <div className="w-20 h-20 rounded-md bg-brand-light-gray"></div>
                    </div>
                </div>
                {/* Product Details Skeleton */}
                <div>
                    <div className="h-10 bg-brand-light-gray rounded w-3/4"></div>
                    <div className="h-8 bg-brand-light-gray rounded w-1/3 mt-4"></div>
                    <div className="h-4 bg-brand-light-gray rounded w-full mt-6"></div>
                    <div className="h-4 bg-brand-light-gray rounded w-full mt-2"></div>
                    <div className="h-4 bg-brand-light-gray rounded w-5/6 mt-2"></div>
                    <div className="mt-8 flex items-center space-x-6">
                        <div className="h-12 bg-brand-light-gray rounded-full w-32"></div>
                        <div className="h-12 bg-brand-light-gray rounded-full flex-1"></div>
                    </div>
                    <div className="h-12 bg-brand-light-gray rounded-full w-full mt-4"></div>
                </div>
            </div>
        </div>
    </section>
);