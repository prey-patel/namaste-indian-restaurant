import React, { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export type PublicCategory = {
  id: string;
  name_pl: string;
  name_en: string;
  slug: string;
  display_order: number;
};

type CategoryTabsProps = {
  categories: PublicCategory[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  locale: string;
};

export default function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  locale,
}: CategoryTabsProps) {
  const t = useTranslations('menu');
  const isPl = locale === 'pl';
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll active chip into view on mobile
  useEffect(() => {
    if (!containerRef.current) return;
    const activeElement = containerRef.current.querySelector('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeCategory]);

  return (
    <div className="w-full relative py-2 border-b border-primary/10">
      <div 
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-none gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:overflow-x-visible md:flex-wrap md:justify-center"
        role="tablist"
        aria-label={t('title')}
      >
        {/* "All" button */}
        <button
          role="tab"
          aria-selected={activeCategory === null}
          data-active={activeCategory === null}
          tabIndex={0}
          onClick={() => onCategoryChange(null)}
          className={`whitespace-nowrap px-5 py-2.5 rounded-full border text-xs font-bold tracking-widest uppercase font-sans transition-all duration-200 outline-none
            ${activeCategory === null 
              ? 'bg-primary text-[#070B1E] border-primary shadow-[0_0_12px_rgba(212,175,55,0.2)]' 
              : 'border-primary/20 bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40'
            }
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B1E]
          `}
        >
          {t('allCategories')}
        </button>

        {/* Categories buttons */}
        {categories.map((category) => {
          const isSelected = activeCategory === category.id;
          const categoryName = isPl ? category.name_pl : category.name_en;

          return (
            <button
              key={category.id}
              role="tab"
              aria-selected={isSelected}
              data-active={isSelected}
              tabIndex={0}
              onClick={() => onCategoryChange(category.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full border text-xs font-bold tracking-widest uppercase font-sans transition-all duration-200 outline-none
                ${isSelected 
                  ? 'bg-primary text-[#070B1E] border-primary shadow-[0_0_12px_rgba(212,175,55,0.2)]' 
                  : 'border-primary/20 bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40'
                }
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B1E]
              `}
            >
              {categoryName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
