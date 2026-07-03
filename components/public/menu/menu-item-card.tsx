import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import GoldFrame from '@/components/ui/gold-frame';
import DietaryBadge from './dietary-badge';
import { X } from 'lucide-react';

export type PublicMenuItem = {
  id: string;
  category_id: string;
  name_pl: string;
  name_en: string;
  description_pl: string | null;
  description_en: string | null;
  price: number;
  image_url: string | null;
  spiciness: number;
  allergens: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_chef_special: boolean;
  is_popular: boolean;
  is_new: boolean;
  display_order: number;
  signed_image_url?: string | null;
  is_available: boolean;
};

type MenuItemCardProps = {
  item: PublicMenuItem;
  locale: string;
};

export default function MenuItemCard({ item, locale }: MenuItemCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const t = useTranslations('menu');
  const isPl = locale === 'pl';

  const name = isPl ? item.name_pl : item.name_en;
  const description = isPl ? item.description_pl : item.description_en;
  const priceFormatted = `${item.price.toFixed(2)} PLN`;

  // Spiciness rendering helper
  const renderSpiciness = (level: number) => {
    if (level <= 0) return null;
    return (
      <div 
        className="flex items-center space-x-0.5 text-primary" 
        title={t(`spiciness.${level}` as any)}
        aria-label={t(`spiciness.${level}` as any)}
      >
        {Array.from({ length: level }).map((_, idx) => (
          <svg 
            key={idx} 
            className="w-3.5 h-3.5 fill-current" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {/* Custom Premium Chili Outline / Fill SVG */}
            <path d="M12 2c.6 0 1 .4 1 1v2.5c2.5.4 4.5 2.1 5.5 4.5.3.7.1 1.5-.5 2l-8 7c-.6.5-1.4.5-2 0l-4-3.5c-.6-.5-.8-1.3-.5-2 .5-1.3 1.5-2.4 2.8-3.1L5 8.5C4.4 8 4 7.2 4.4 6.5s1.2-1 1.8-.5l2.3 1.8C9.5 7 10.7 6.6 12 6.5V3c0-.6.4-1 1-1z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <GoldFrame className="h-full flex flex-col transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_15px_rgba(212,175,55,0.05)]">
      <div className="flex flex-col h-full space-y-4">
        
        {/* Image Container / Premium Placeholder */}
        <div className="relative aspect-[16/10] w-full rounded overflow-hidden bg-[#0A1128] border border-primary/10">
          {item.signed_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.signed_image_url}
              alt={name}
              className="object-cover w-full h-full transition-transform duration-500 hover:scale-105 cursor-pointer hover:opacity-90"
              loading="lazy"
              onClick={() => setIsLightboxOpen(true)}
            />
          ) : (
            /* Premium Navy/Gold Placeholder */
            <div className="w-full h-full flex flex-col items-center justify-center relative p-4 text-center select-none" aria-hidden="true">
              <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Subtle gold lines */}
              <div className="absolute inset-2 border border-primary/5 rounded" />
              
              {/* Mandala center icon */}
              <svg className="w-10 h-10 text-primary/30 mb-2 animate-[spin_360s_linear_infinite] motion-reduce:!animate-none" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2,2" />
                <path d="M50 5 L47 15 L50 12 L53 15 Z" />
                <path d="M50 95 L47 85 L50 88 L53 85 Z" />
                <path d="M5 50 L15 47 L12 50 L15 53 Z" />
                <path d="M95 50 L85 47 L88 50 L85 53 Z" />
              </svg>
              <span className="text-[10px] font-serif font-bold text-primary/40 tracking-widest uppercase">
                Namaste
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
            {item.is_chef_special && <DietaryBadge type="chef_special" />}
            {item.is_popular && <DietaryBadge type="popular" />}
            {item.is_new && <DietaryBadge type="new" />}
          </div>
        </div>

        {/* Dish Title & Price Info */}
        <div className="space-y-1 flex-grow">
          <div className="flex justify-between items-start space-x-2">
            <h3 className="font-serif font-bold text-foreground text-base sm:text-lg tracking-wide line-clamp-2 leading-tight">
              {name}
            </h3>
            <span className="text-sm sm:text-base text-primary font-serif font-extrabold tracking-wider whitespace-nowrap pt-0.5">
              {priceFormatted}
            </span>
          </div>

          {/* Spiciness indicator */}
          {item.spiciness > 0 && (
            <div className="pt-0.5">
              {renderSpiciness(item.spiciness)}
            </div>
          )}

          {/* Dish Description */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed font-light pt-2 line-clamp-3">
              {description}
            </p>
          )}
        </div>

        {/* Dietary tags & Allergens footer */}
        <div className="pt-3 border-t border-primary/10 space-y-2 text-[11px] mt-auto">
          {/* Dietary options */}
          <div className="flex flex-wrap gap-1.5">
            {item.is_vegetarian && <DietaryBadge type="vegetarian" />}
            {item.is_vegan && <DietaryBadge type="vegan" />}
            {item.is_gluten_free && <DietaryBadge type="gluten_free" />}
          </div>

          {/* Allergens listing */}
          {item.allergens && item.allergens.length > 0 && (
            <p className="text-muted-foreground font-sans leading-normal">
              <span className="text-primary/70 font-semibold uppercase tracking-wider text-[9px] mr-1">
                {t('allergens.title')}:
              </span>
              <span className="font-light">
                {item.allergens.join(', ')}
              </span>
            </p>
          )}
        </div>

      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && item.signed_image_url && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors p-2 bg-black/40 rounded-full border border-white/10 hover:border-primary/40 focus:outline-none z-10"
            aria-label="Close full screen image"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Image container */}
          <div 
            className="relative max-w-5xl w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          >
            <Image
              src={item.signed_image_url}
              alt={name}
              width={800}
              height={600}
              unoptimized
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-md shadow-2xl border border-primary/20 animate-scale-up"
            />
          </div>
        </div>
      )}
    </GoldFrame>
  );
}
