'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import Image from 'next/image';

type GalleryItem = {
  id: string;
  src: string;
  category: 'dishes' | 'ambience' | 'kitchen';
  title_en: string;
  title_pl: string;
  aspectClass: string;
};

// Static default premium images with dynamic mosaic aspect ratios
const DEFAULT_ITEMS: GalleryItem[] = [
  {
    id: 'static-butter-chicken',
    src: '/images/butter_chicken.png',
    category: 'dishes',
    title_en: 'Classic Butter Chicken',
    title_pl: 'Klasyczny Butter Chicken',
    aspectClass: 'aspect-[4/3]'
  },
  {
    id: 'static-dining-ambience',
    src: '/images/dining_ambience.png',
    category: 'ambience',
    title_en: 'Namaste Dining Room',
    title_pl: 'Sala Restauracyjna Namaste',
    aspectClass: 'aspect-[16/10]'
  },
  {
    id: 'static-chef-craft',
    src: '/images/chef_craft.png',
    category: 'kitchen',
    title_en: 'Tandoor Oven Craft',
    title_pl: 'Rzemiosło Pieca Tandoor',
    aspectClass: 'aspect-[3/4]'
  },
  {
    id: 'static-chicken-biryani',
    src: '/images/chicken_biryani.png',
    category: 'dishes',
    title_en: 'Chicken Biryani',
    title_pl: 'Biryani z Kurczakiem',
    aspectClass: 'aspect-[4/5]'
  },
  {
    id: 'static-philosophy-curry',
    src: '/images/philosophy_curry.png',
    category: 'kitchen',
    title_en: 'Spices Ground Daily',
    title_pl: 'Przyprawy Mielone Codziennie',
    aspectClass: 'aspect-square'
  },
  {
    id: 'static-dal-makhani',
    src: '/images/dal_makhani.png',
    category: 'dishes',
    title_en: 'Dal Makhani',
    title_pl: 'Dal Makhani',
    aspectClass: 'aspect-[4/3]'
  },
  {
    id: 'static-garlic-naan',
    src: '/images/garlic_naan.png',
    category: 'dishes',
    title_en: 'Garlic Naan',
    title_pl: 'Chlebek Naan z Czosnkiem',
    aspectClass: 'aspect-[16/9]'
  },
  {
    id: 'static-hero-kebabs',
    src: '/images/hero_kebabs.png',
    category: 'dishes',
    title_en: 'Tandoori Seekh Kebabs',
    title_pl: 'Szaszłyki Tandoori Seekh',
    aspectClass: 'aspect-[3/2]'
  }
];

type GalleryClientProps = {
  locale: string;
  dbImages: {
    id: string;
    url: string;
    bucket: string;
    alt_text_pl: string | null;
    alt_text_en: string | null;
  }[];
};

export default function GalleryClient({ locale, dbImages }: GalleryClientProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Map database images with varying aspect ratios for dynamic staggered heights
  const mappedDbItems: GalleryItem[] = dbImages.map((img, idx) => ({
    id: img.id,
    src: img.url,
    category: img.bucket === 'site-images' ? 'ambience' : 'dishes',
    title_en: img.alt_text_en || 'Namaste Specialty',
    title_pl: img.alt_text_pl || 'Specjalność Namaste',
    aspectClass: idx % 3 === 0 ? 'aspect-square' : idx % 3 === 1 ? 'aspect-[16/10]' : 'aspect-[3/4]'
  }));

  // Merge static defaults with dynamic database images
  const allItems = [...mappedDbItems, ...DEFAULT_ITEMS];

  const openLightbox = (item: GalleryItem) => {
    const idx = allItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      setSelectedIdx(idx);
    }
  };

  const handleClose = () => setSelectedIdx(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : allItems.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null && prev < allItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-8">
      {/* Clean Dynamic Masonry Column Grid */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {allItems.map((item) => {
          const title = locale === 'pl' ? item.title_pl : item.title_en;

          return (
            <div
              key={item.id}
              className="break-inside-avoid group cursor-pointer w-full mb-4 block"
              onClick={() => openLightbox(item)}
            >
              <div className="relative overflow-hidden rounded-2xl border border-primary/10 hover:border-primary/45 transition-all duration-500 shadow-md bg-[#070B1E]/60 p-1.5 hover:shadow-primary/5">
                <div className={`relative w-full ${item.aspectClass} overflow-hidden rounded-xl`}>
                  <Image
                    src={item.src}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    unoptimized={item.src.startsWith('http')} // Don't optimize remote Supabase URLs
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {allItems.length === 0 && (
        <div className="text-center py-16 border border-dashed border-primary/20 rounded-xl space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary/40 mx-auto">
            <Grid className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-xs font-sans tracking-wide">
            No images available.
          </p>
        </div>
      )}

      {/* Lightbox / Fullscreen Modal Slider (Focused entirely on visuals) */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-[#040714]/95 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12"
          >
            {/* Top Close Bar & Subtle Index Counter */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
              <span className="text-xs text-white/50 font-sans tracking-widest select-none">
                {selectedIdx + 1} / {allItems.length}
              </span>
              <button
                onClick={handleClose}
                className="p-3 bg-white/5 border border-white/10 text-white hover:text-primary hover:bg-primary/10 hover:border-primary/20 rounded-full transition-all duration-300 focus:outline-none"
                aria-label="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slider Content Wrapper */}
            <div className="relative w-full max-w-5xl aspect-[4/3] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {/* Prev Button */}
              <button
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-45 p-3 bg-white/5 border border-white/10 text-white hover:text-primary hover:bg-primary/10 hover:border-primary/20 rounded-full transition-all duration-300 focus:outline-none"
                aria-label="Previous Image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Dynamic Image Display with animations */}
              <motion.div
                key={allItems[selectedIdx].id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full border border-primary/20 rounded-lg overflow-hidden bg-black/45"
              >
                <Image
                  src={allItems[selectedIdx].src}
                  alt={locale === 'pl' ? allItems[selectedIdx].title_pl : allItems[selectedIdx].title_en}
                  fill
                  priority
                  className="object-contain"
                  unoptimized={allItems[selectedIdx].src.startsWith('http')}
                />
              </motion.div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-45 p-3 bg-white/5 border border-white/10 text-white hover:text-primary hover:bg-primary/10 hover:border-primary/20 rounded-full transition-all duration-300 focus:outline-none"
                aria-label="Next Image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
