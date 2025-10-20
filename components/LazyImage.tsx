import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  placeholderClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, wrapperClassName, placeholderClassName, wrapperStyle, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative ${wrapperClassName || ''} ${placeholderClassName || ''}`} style={wrapperStyle}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-brand-light-gray animate-pulse rounded-inherit"></div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ''} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
};

export default LazyImage;
