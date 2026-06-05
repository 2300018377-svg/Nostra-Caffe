import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackKeyword: string;
  className?: string;
}

const UNSPLASH_FALLBACKS: Record<string, string> = {
  espresso: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=400&fit=crop',
  milkshake: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=400&fit=crop',
  'ice tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
  fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop',
  cocktail: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&h=400&fit=crop',
};

export const ImageWithFallback = ({ 
  src, 
  alt, 
  fallbackKeyword, 
  className = '' 
}: ImageWithFallbackProps) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = UNSPLASH_FALLBACKS[fallbackKeyword] || UNSPLASH_FALLBACKS.espresso;
      setImgSrc(fallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
};
