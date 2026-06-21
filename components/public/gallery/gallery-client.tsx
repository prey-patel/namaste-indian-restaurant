'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Grid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import PremiumCard from '@/components/ui/premium-card';
import GoldFrame from '@/components/ui/gold-frame';
import PremiumButton from '@/components/ui/premium-button';

type GalleryItem = {
  id: string;
  src: string;
  category: 'dishes' | 'ambience' | 'kitchen';
  title_en: string;
  title_pl: string;
  description_en?: string;
  description_pl?: string;
};

// Static default premium images already in public/images
const DEFAULT_ITEMS: GalleryItem[] = [
  {
    id: 'static-butter-chicken',
    src: '/images/butter_chicken.png',
    category: 'dishes',
    title_en: 'Classic Butter Chicken',
    title_pl: 'Klasyczny Butter Chicken',
    description_en: 'Tender chicken in a rich, buttery tomato sauce with aromatic spices.',
    description_pl: 'Delikatny kurczak w bogatym, maślanym sosie pomidorowym z przyprawami.'
  },
  {
    id: 'static-dining-ambience',
    src: '/images/dining_ambience.png',
    category: 'ambience',
    title_en: 'Namaste Dining Room',
    title_pl: 'Sala Restauracyjna Namaste',
    description_en: 'A warm, gold-accented atmosphere crafted for an authentic dining experience.',
    description_pl: 'Ciepła atmosfera ze złotymi akcentami stworzona z myślą o autentycznych doznaniach.'
  },
  {
    id: 'static-chef-craft',
    src: '/images/chef_craft.png',
    category: 'kitchen',
    title_en: 'Tandoor Oven Craft',
    title_pl: 'Rzemiosło Pieca Tandoor',
    description_en: 'Baking fresh breads and roasting skewered meats at temperatures above 400°C.',
    description_pl: 'Wypiekanie świeżego chleba i pieczenie mięs w temperaturze powyżej 400°C.'
  },
  {
    id: 'static-chicken-biryani',
    src: '/images/chicken_biryani.png',
    category: 'dishes',
    title_en: 'Chicken Biryani',
    title_pl: 'Biryani z Kurczakiem',
    description_en: 'Fragrant basmati rice layered with spiced chicken, saffron, and fresh herbs.',
    description_pl: 'Aromatyczny ryż basmati przekładany kurczakiem w przyprawach, szafranem i ziołami.'
  },
  {
    id: 'static-philosophy-curry',
    src: '/images/philosophy_curry.png',
    category: 'kitchen',
    title_en: 'Spices Ground Daily',
    title_pl: 'Przyprawy Mielone Codziennie',
    description_en: 'A traditional mortar and pestle technique to capture the essential spice oils.',
    description_pl: 'Tradycyjna metoda ucierania przypraw w celu wydobycia olejków eterycznych.'
  },
  {
    id: 'static-dal-makhani',
    src: '/images/dal_makhani.png',
    category: 'dishes',
    title_en: 'Dal Makhani',
    title_pl: 'Dal Makhani',
    description_en: 'Creamy black lentils slow-cooked for 24 hours with butter and spices.',
    description_pl: 'Kremowa czarna soczewica wolno gotowana przez 24 godziny z masłem i przyprawami.'
  },
  {
    id: 'static-garlic-naan',
    src: '/images/garlic_naan.png',
    category: 'dishes',
    title_en: 'Garlic Naan',
    title_pl: 'Chlebek Naan z Czosnkiem',
    description_en: 'Clay-oven baked flatbread brushed with garlic butter and fresh cilantro.',
    description_pl: 'Chlebek z pieca tandoor posmarowany masłem czosnkowym i świeżą kolendrą.'
  },
  {
    id: 'static-hero-kebabs',
    src: '/images/hero_kebabs.png',
    category: 'dishes',
    title_en: 'Tandoori Seekh Kebabs',
    title_pl: 'Szaszłyki Tandoori Seekh',
    description_en: 'Skewered minced meat seasoned with cumin, mint, and grilled to perfection.',
    description_pl: 'Mielone mięso doprawione kminem i miętą, pieczone na szpadach w piecu tandoor.'
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
  const t = useTranslations('gallery');
  const [filter, setFilter] = useState<'all' | 'dishes' | 'ambience' | 'kitchen'>('all');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Map database images if available
  const mappedDbItems: GalleryItem[] = dbImages.map((img) => ({
    id: img.id,
    src: img.url,
    category: img.bucket === 'site-images' ? 'ambience' : 'dishes',
    title_en: img.alt_text_en || 'Namaste Specialty',
    title_pl: img.alt_text_pl || 'Specjalność Namaste',
    description_en: 'Uploaded restaurant media asset.',
    description_pl: 'Przesłany plik multimedialny restauracji.'
  }));

  // Merge static defaults with dynamic database images
  const allItems = [...mappedDbItems, ...DEFAULT_ITEMS];

  // Filter items
  const filteredItems = allItems.filter(
    (item) => filter === 'all' || item.category === filter
  );

  const openLightbox = (item: GalleryItem) => {
    const idx = filteredItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      setSelectedIdx(idx);
    }
  };

  const handleClose = () => setSelectedIdx(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-12">
      {/* Category Selection Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:max-w-xl mx-auto border-b border-primary/10 pb-4">
        {(['all', 'dishes', 'ambience', 'kitchen'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs uppercase font-sans font-bold tracking-widest px-4 py-2.5 rounded-lg border transition-all duration-300 relative ${
              filter === cat
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-primary/20'
            }`}
          >
            {t(`filters.${cat}`)}
            {filter === cat && (
              <motion.span
                layoutId="activeFilterIndicator"
                className="absolute inset-0 border border-primary rounded-lg pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch"
      >
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const title = locale === 'pl' ? item.title_pl : item.title_en;
            const desc = locale === 'pl' ? item.description_pl : item.description_en;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={item.id}
                className="group cursor-pointer h-full"
                onClick={() => openLightbox(item)}
              >
                <PremiumCard hoverable className="p-3 bg-[#070B1E]/60 border-primary/10 hover:border-primary/40 flex flex-col h-full justify-between">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-primary/5 group-hover:border-primary/25 transition-colors duration-300">
                    <Image
                      src={item.src}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      unoptimized={item.src.startsWith('http')} // Don't optimize remote Supabase URLs
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-[#040714]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="text-center p-4 space-y-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <span className="inline-flex p-2 bg-primary/10 rounded-full text-primary border border-primary/20">
                          <Eye className="w-5 h-5" />
                        </span>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-primary">
                          {t(`filters.${item.category}`)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Caption details */}
                  <div className="pt-4 pb-2 px-1 text-left space-y-1 mt-auto">
                    <h3 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-300">
                      {title}
                    </h3>
                    {desc && (
                      <p className="text-[11px] text-muted-foreground font-light leading-relaxed line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>
                </PremiumCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 border border-dashed border-primary/20 rounded-xl space-y-4 max-w-md mx-auto"
        >
          <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary/40 mx-auto">
            <Grid className="w-6 h-6" />
          </div>
          <p className="text-muted-foreground text-xs font-sans tracking-wide">
            {t('empty')}
          </p>
        </motion.div>
      )}

      {/* Lightbox / Fullscreen Modal Slider */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-[#040714]/95 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12"
          >
            {/* Top Close Bar */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
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
                key={filteredItems[selectedIdx].id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full border border-primary/20 rounded-lg overflow-hidden bg-black/45"
              >
                <Image
                  src={filteredItems[selectedIdx].src}
                  alt={locale === 'pl' ? filteredItems[selectedIdx].title_pl : filteredItems[selectedIdx].title_en}
                  fill
                  priority
                  className="object-contain"
                  unoptimized={filteredItems[selectedIdx].src.startsWith('http')}
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

            {/* Bottom Caption Block */}
            <div className="mt-6 text-center max-w-xl space-y-2 pointer-events-none">
              <h4 className="font-serif font-black text-xl text-primary tracking-wide">
                {locale === 'pl' ? filteredItems[selectedIdx].title_pl : filteredItems[selectedIdx].title_en}
              </h4>
              {filteredItems[selectedIdx].description_en && (
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {locale === 'pl' ? filteredItems[selectedIdx].description_pl : filteredItems[selectedIdx].description_en}
                </p>
              )}
              <div className="text-[10px] text-primary/50 tracking-[0.2em] font-sans font-bold uppercase pt-1">
                {selectedIdx + 1} / {filteredItems.length} &bull; {t(`filters.${filteredItems[selectedIdx].category}`)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
